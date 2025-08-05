import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { RefreshCw, Plus, Edit2, Check, X, Battery } from 'lucide-react';

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
  battery_level: number;
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
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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

  const updateDeviceName = async (devid: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('device_config')
        .update({ name: newName })
        .eq('devid', devid);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update device name",
          variant: "destructive",
        });
        return;
      }

      setDevices(prev => prev.map(device => 
        device.devid === devid ? { ...device, name: newName } : device
      ));
      
      toast({
        title: "Success",
        description: "Device name updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update device name",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (device: DeviceConfig) => {
    setEditingDevice(device.devid);
    setEditName(device.name || device.devid);
  };

  const handleSaveEdit = async () => {
    if (editingDevice && editName.trim()) {
      await updateDeviceName(editingDevice, editName.trim());
      setEditingDevice(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingDevice(null);
    setEditName('');
  };

  const getBatteryColor = (level: number) => {
    if (level >= 60) return 'text-green-500';
    if (level >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBatteryIcon = (level: number) => {
    return <Battery className={`h-4 w-4 ${getBatteryColor(level)}`} />;
  };

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
                  <div className="flex-1">
                    {editingDevice === device.devid ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-lg font-semibold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{device.name || device.devid}</CardTitle>
                        {(role === 'admin' || role === 'moderator') && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditClick(device)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    <CardDescription>ID: {device.devid}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(device.devid)}
                    {device.battery_level && (
                      <div className="flex items-center gap-1 text-sm">
                        {getBatteryIcon(device.battery_level)}
                        <span className={getBatteryColor(device.battery_level)}>
                          {device.battery_level}%
                        </span>
                      </div>
                    )}
                  </div>
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
                
                {location && location.data && typeof location.data === 'object' && (location.data.lat || location.data.latitude) && (location.data.lng || location.data.longitude) && (
                  <div className="text-sm space-y-1 pt-2 border-t">
                    <p><strong>Location:</strong> {(location.data.lat || location.data.latitude).toFixed(4)}, {(location.data.lng || location.data.longitude).toFixed(4)}</p>
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