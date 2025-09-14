import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApplicationContext } from '@/contexts/ApplicationContext';

interface SensorDataPoint {
  id: string;
  devid: string;
  data_type: string;
  data: any;
  uplink_count: number | null;
  created_at: string;
}

interface UseSensorDataProps {
  deviceId?: string;
  dataTypes?: string[];
  limit?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export const useSensorData = ({
  deviceId,
  dataTypes,
  limit = 100,
  timeRange
}: UseSensorDataProps = {}) => {
  const { currentProfile } = useApplicationContext();
  const [data, setData] = useState<SensorDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSensorData = async () => {
    if (!currentProfile && !dataTypes) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (deviceId) {
        query = query.eq('devid', deviceId);
      }

      if (dataTypes) {
        query = query.in('data_type', dataTypes);
      } else if (currentProfile?.config?.primary_sensors) {
        query = query.in('data_type', currentProfile.config.primary_sensors);
      }

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data: sensorData, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setData(sensorData || []);
    } catch (err) {
      console.error('Error fetching sensor data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
  }, [deviceId, dataTypes, currentProfile, limit, timeRange]);

  const refetch = () => {
    fetchSensorData();
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
};