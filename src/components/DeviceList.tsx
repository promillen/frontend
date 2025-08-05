import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { RefreshCw, Plus } from 'lucide-react';

interface DeviceConfig {
  devid: string;
  name: string;
  iccid: string;
  heartbeat_interval: number;
  sw_version: string;
  hw_version: string;
  application_mode: string;
  device_data_updated_at: string;
  last_seen: string;
  created_at: string;
}

interface LocationSensorData {
  id: string;
  devid: string;
  data_type: string;
  data: any; // JSONB data from Supabase
  created_at: string;
}

const DeviceList = () => {
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [deviceLocations, setDeviceLocations] = useState<{ [key: string]: LocationSensorData }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { role } = useUserRole();

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('device_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching devices:', error);
        toast({
          title: "Error",
          description: "Failed to fetch devices",
          variant: "destructive",
        });
        return;
      }

      setDevices(data || []);

      // Fetch latest location for each device from sensor_data
      if (data && data.length > 0) {
        const locationPromises = data.map(async (device) => {
          const { data: locationData } = await supabase
            .from('sensor_data')
            .select('*')
            .eq('devid', device.devid)
            .eq('data_type', 'location')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          return { deviceId: device.devid, location: locationData };
        });

        const locations = await Promise.all(locationPromises);
        const locationMap = locations.reduce((acc, { deviceId, location }) => {
          if (location) {
            acc[deviceId] = location;
          }
          return acc;
        }, {} as { [key: string]: LocationSensorData });

        setDeviceLocations(locationMap);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch devices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const getStatusBadge = (deviceId: string) => {
    const device = devices.find(d => d.devid === deviceId);
    if (!device?.last_seen) {
      return <Badge variant="secondary">No Data</Badge>;
    }

    const lastUpdate = new Date(device.last_seen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    if (diffMinutes < 30) {
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    } else if (diffMinutes < 120) {
      return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
    } else {
      return <Badge variant="destructive">Offline</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Devices</h2>
        <div className="flex gap-2">
          <Button onClick={fetchDevices} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {(role === 'admin' || role === 'moderator') && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const location = deviceLocations[device.devid];
          return (
            <Card key={device.devid}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{device.name || device.devid}</CardTitle>
                    <CardDescription>ID: {device.devid}</CardDescription>
                  </div>
                  {getStatusBadge(device.devid)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p><strong>HW Version:</strong> {device.hw_version}</p>
                  <p><strong>SW Version:</strong> {device.sw_version}</p>
                  {device.iccid && <p><strong>ICCID:</strong> {device.iccid}</p>}
                  <p><strong>Mode:</strong> {device.application_mode}</p>
                  {device.heartbeat_interval && (
                    <p><strong>Heartbeat:</strong> {device.heartbeat_interval}s</p>
                  )}
                </div>
                
                {location && location.data && typeof location.data === 'object' && location.data.latitude && location.data.longitude && (
                  <div className="text-sm space-y-1 pt-2 border-t">
                    <p><strong>Location:</strong> {location.data.latitude.toFixed(4)}, {location.data.longitude.toFixed(4)}</p>
                    {location.data.altitude && <p><strong>Altitude:</strong> {location.data.altitude}m</p>}
                    {location.data.accuracy && <p><strong>Accuracy:</strong> {location.data.accuracy}m</p>}
                    <p><strong>Last Location:</strong> {new Date(location.created_at).toLocaleString()}</p>
                  </div>
                )}
                
                {device.last_seen && (
                  <div className="text-sm pt-2 border-t">
                    <p><strong>Last Seen:</strong> {new Date(device.last_seen).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No devices found. Add your first device to get started.</p>
        </div>
      )}
    </div>
  );
};

export default DeviceList;