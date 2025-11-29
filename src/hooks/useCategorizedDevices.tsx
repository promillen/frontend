import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategorizedDevices {
  noActivationCode: string[]; // Devices in device_config but not in device_activations
  unclaimedWithCode: string[]; // Devices with activation code but unclaimed
  claimedByStaff: string[]; // Devices claimed by moderator/admin/developer
}

export const useCategorizedDevices = (isDeveloper: boolean) => {
  const [categories, setCategories] = useState<CategorizedDevices>({
    noActivationCode: [],
    unclaimedWithCode: [],
    claimedByStaff: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isDeveloper) {
      setLoading(false);
      return;
    }

    const fetchCategorizedDevices = async () => {
      try {
        // Get all devices from device_config
        const { data: allDevices, error: devicesError } = await supabase
          .from('device_config')
          .select('devid');

        if (devicesError) {
          console.error('Error fetching devices:', devicesError);
          setLoading(false);
          return;
        }

        // Get all device activations
        const { data: activations, error: activationsError } = await supabase
          .from('device_activations')
          .select('device_id, claimed, owner_id');

        if (activationsError) {
          console.error('Error fetching activations:', activationsError);
          setLoading(false);
          return;
        }

        const allDeviceIds = new Set(allDevices?.map(d => d.devid) || []);
        const activationsMap = new Map(
          activations?.map(a => [a.device_id, a]) || []
        );

        const noActivationCode: string[] = [];
        const unclaimedWithCode: string[] = [];
        const claimedByStaff: string[] = [];

        // Categorize devices
        for (const deviceId of allDeviceIds) {
          const activation = activationsMap.get(deviceId);
          
          if (!activation) {
            // Device has no activation code
            noActivationCode.push(deviceId);
          } else if (!activation.claimed) {
            // Device has activation code but is unclaimed
            unclaimedWithCode.push(deviceId);
          } else if (activation.owner_id) {
            // Device is claimed, check if owner is staff
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', activation.owner_id)
              .single();

            if (roleData && ['moderator', 'admin', 'developer'].includes(roleData.role)) {
              claimedByStaff.push(deviceId);
            }
          }
        }

        // Check for devices in activations but not in device_config
        for (const activation of activations || []) {
          if (!allDeviceIds.has(activation.device_id) && !activation.claimed) {
            unclaimedWithCode.push(activation.device_id);
          }
        }

        setCategories({
          noActivationCode,
          unclaimedWithCode,
          claimedByStaff
        });
      } catch (error) {
        console.error('Error categorizing devices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategorizedDevices();
  }, [isDeveloper]);

  return { categories, loading };
};
