import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DatabaseLog {
  id: string;
  timestamp: string;
  type: 'sensor_data' | 'activity' | 'reboot';
  message: string;
  data: any;
  uplink_count?: number;
}

export const useDeviceLogs = (deviceId: string | null) => {
  const [logs, setLogs] = useState<DatabaseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDatabaseLogs = async () => {
    if (!deviceId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch sensor data logs
      const { data: sensorData, error: sensorError } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('devid', deviceId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch activity logs  
      const { data: activityData, error: activityError } = await supabase
        .from('activity')
        .select('*')
        .eq('devid', deviceId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch reboot logs
      const { data: rebootData, error: rebootError } = await supabase
        .from('reboot')
        .select('*')
        .eq('devid', deviceId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sensorError || activityError || rebootError) {
        throw new Error('Failed to fetch logs');
      }

      // Combine and format logs
      const combinedLogs: DatabaseLog[] = [
        ...(sensorData || []).map(log => ({
          id: log.id,
          timestamp: log.created_at || '',
          type: 'sensor_data' as const,
          message: `Sensor Data: ${log.data_type} (uplink: ${log.uplink_count || 'N/A'})`,
          data: log.data,
          uplink_count: log.uplink_count
        })),
        ...(activityData || []).map(log => ({
          id: log.id,
          timestamp: log.created_at || '',
          type: 'activity' as const,
          message: `Activity: Sleep:${log.sleep}ms, Modem:${log.modem}ms, GNSS:${log.gnss}ms (uplink: ${log.uplink_count || 'N/A'})`,
          data: { sleep: log.sleep, modem: log.modem, gnss: log.gnss, wifi: log.wifi, other: log.other },
          uplink_count: log.uplink_count
        })),
        ...(rebootData || []).map(log => ({
          id: log.id,
          timestamp: log.created_at || '',
          type: 'reboot' as const,
          message: `Reboot: ${log.reason} ${log.file ? `at ${log.file}:${log.line}` : ''} (uplink: ${log.uplink_count || 'N/A'})`,
          data: { reason: log.reason, file: log.file, line: log.line },
          uplink_count: log.uplink_count
        }))
      ];

      // Sort by timestamp (most recent first)
      combinedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Take only the 10 most recent across all types
      setLogs(combinedLogs.slice(0, 10));
    } catch (err) {
      console.error('Error fetching device logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      fetchDatabaseLogs();
    } else {
      setLogs([]);
    }
  }, [deviceId]);

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'sensor_data': return 'default';
      case 'activity': return 'secondary';
      case 'reboot': return 'destructive';
      default: return 'outline';
    }
  };

  return {
    logs,
    loading,
    error,
    refetch: fetchDatabaseLogs,
    getLogTypeColor
  };
};