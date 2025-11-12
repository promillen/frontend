import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  id: string;
  devid: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  location_type: string;
  created_at: string;
}

export const useLatestLocation = (deviceId: string) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLatestLocation = async () => {
    if (!deviceId) {
      setLocation(null);
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('devid', deviceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching location:', error);
        setLocation(null);
      } else {
        setLocation(data);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestLocation();
  }, [deviceId]);

  return {
    location,
    loading,
    refreshLocation: fetchLatestLocation
  };
};
