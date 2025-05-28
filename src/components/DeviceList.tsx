
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { RefreshCw, Plus } from 'lucide-react';

interface Device {
  id: string;
  dev_id: string;
  name: string;
  description: string;
  hw_version: string;
  sw_version: string;
  iccid: string;
  created_at: string;
  updated_at: string;
}

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  temperature: number;
  battery_level: number;
  signal_strength: number;
  timestamp: string;
}

const DeviceList = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceLocations, setDeviceLocations] = useState<{ [key: string]: LocationData }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { role } = useUserRole();

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
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

      // Fetch latest location for each device
      if (data && data.length > 0) {
        const locationPromises = data.map(async (device) => {
          const { data: locationData } = await supabase
            .from('location_data')
            .select('*')
            .eq('device_id', device.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
          
          return { deviceId: device.id, location: locationData };
        });

        const locations = await Promise.all(locationPromises);
        const locationMap = locations.reduce((acc, { deviceId, location }) => {
          if (location) {
            acc[deviceId] = location;
          }
          return acc;
        }, {} as { [key: string]: LocationData });

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
    const location = deviceLocations[deviceId];
    if (!location) {
      return <Badge variant="secondary">No Data</Badge>;
    }

    const lastUpdate = new Date(location.timestamp);
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
          const location = deviceLocations[device.id];
          return (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{device.name || device.dev_id}</CardTitle>
                    <CardDescription>ID: {device.dev_id}</CardDescription>
                  </div>
                  {getStatusBadge(device.id)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p><strong>HW Version:</strong> {device.hw_version}</p>
                  <p><strong>SW Version:</strong> {device.sw_version}</p>
                  {device.iccid && <p><strong>ICCID:</strong> {device.iccid}</p>}
                </div>
                
                {location && (
                  <div className="text-sm space-y-1 pt-2 border-t">
                    <p><strong>Location:</strong> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
                    {location.temperature && <p><strong>Temperature:</strong> {location.temperature}°C</p>}
                    {location.battery_level && <p><strong>Battery:</strong> {location.battery_level}%</p>}
                    {location.signal_strength && <p><strong>Signal:</strong> {location.signal_strength}dBm</p>}
                    <p><strong>Last Update:</strong> {new Date(location.timestamp).toLocaleString()}</p>
                  </div>
                )}
                
                {device.description && (
                  <p className="text-sm text-gray-600 pt-2 border-t">{device.description}</p>
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
