import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SensorDataItem {
  id: string;
  devid: string;
  data_type: string;
  data: any;
  created_at: string;
}

export const useSensorData = (deviceId: string, dataTypes: string[]) => {
  const [sensorData, setSensorData] = useState<Record<string, SensorDataItem>>({});
  const [loading, setLoading] = useState(false);

  const fetchSensorData = async () => {
    if (!deviceId || dataTypes.length === 0) {
      setSensorData({});
      return;
    }

    setLoading(true);
    
    try {
      // Fetch latest data for each data type
      const dataPromises = dataTypes.map(async (dataType) => {
        const { data, error } = await supabase
          .from('sensor_data')
          .select('*')
          .eq('devid', deviceId)
          .eq('data_type', dataType)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return { dataType, data: data || null, error };
      });

      const results = await Promise.all(dataPromises);
      
      const dataMap = results.reduce((acc, { dataType, data, error }) => {
        if (data && !error) {
          acc[dataType] = data;
        }
        return acc;
      }, {} as Record<string, SensorDataItem>);

      setSensorData(dataMap);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
  }, [deviceId, dataTypes.join(',')]);

  return {
    sensorData,
    loading,
    refreshSensorData: fetchSensorData
  };
};