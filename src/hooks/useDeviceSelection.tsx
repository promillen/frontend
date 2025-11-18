import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useLocalStorage from './useLocalStorage';

export function useDeviceSelection() {
  const [allDevices, setAllDevices] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevicesStorage] = useLocalStorage<string[]>('selectedDevices', []);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch all available devices
  useEffect(() => {
    const fetchAllDevices = async () => {
      try {
        const { data, error } = await supabase
          .from('device_config')
          .select('devid')
          .order('devid');

        if (error) {
          console.error('Error fetching devices:', error);
          return;
        }

        const deviceIds = data?.map(d => d.devid) || [];
        setAllDevices(deviceIds);

        // If no devices are selected in localStorage, select all by default
        if (selectedDevices.length === 0 && deviceIds.length > 0) {
          setSelectedDevicesStorage(deviceIds);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error fetching devices:', error);
        setIsInitialized(true);
      }
    };

    fetchAllDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedDevices = (devices: string[] | ((prev: string[]) => string[])) => {
    setSelectedDevicesStorage(devices);
  };

  return {
    selectedDevices,
    setSelectedDevices,
    allDevices,
    isInitialized
  };
}