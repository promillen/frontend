import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { RefreshCw, Plus, Edit2, Check, X, Search, ChevronDown } from 'lucide-react';
import { Battery } from '@/components/ui/battery';
import { formatInTimeZone } from 'date-fns-tz';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import DeviceFiltersComponent, { DeviceFilters } from './DeviceFilters';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorBoundary from './ErrorBoundary';
import { useLayout } from '@/contexts/LayoutContext';

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
  const [filters, setFilters] = useState<DeviceFilters>({
    search: '',
    status: 'all',
    applicationMode: 'all',
    batteryRange: [0, 100],
    dateRange: {},
  });
  const { toast } = useToast();
  const { role } = useUserRole();
  const { layout } = useLayout();

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

  const updateDeviceMode = async (devid: string, newMode: string) => {
    try {
      const { error } = await supabase
        .from('device_config')
        .update({ application_mode: newMode })
        .eq('devid', devid);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update device mode",
          variant: "destructive",
        });
        return;
      }

      setDevices(prev => prev.map(device => 
        device.devid === devid ? { ...device, application_mode: newMode } : device
      ));
      
      toast({
        title: "Success",
        description: "Device mode updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update device mode",
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

  const getDeviceStatus = (lastSeen: string | null): 'online' | 'warning' | 'offline' => {
    if (!lastSeen) return 'offline';
    
    const lastUpdate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    if (diffMinutes < 30) return 'online';
    if (diffMinutes < 120) return 'warning';
    return 'offline';
  };

  const getStatusBadge = (deviceId: string) => {
    const device = devices.find(d => d.devid === deviceId);
    if (!device?.last_seen) {
      return <Badge variant="secondary">No Data</Badge>;
    }

    const status = getDeviceStatus(device.last_seen);
    
    if (status === 'online') {
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    } else if (status === 'warning') {
      return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
    } else {
      return <Badge variant="destructive">Offline</Badge>;
    }
  };

  const formatDanishTime = (dateString: string) => {
    return formatInTimeZone(new Date(dateString), 'Europe/Copenhagen', 'dd/MM/yyyy HH:mm:ss');
  };

  const applicationModes = ['tracking', 'monitoring', 'maintenance', 'standby'];

  // Apply filters to devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          device.name?.toLowerCase().includes(searchLower) ||
          device.devid.toLowerCase().includes(searchLower) ||
          device.iccid?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const status = getDeviceStatus(device.last_seen);
        if (status !== filters.status) return false;
      }

      // Application mode filter
      if (filters.applicationMode !== 'all') {
        if (device.application_mode !== filters.applicationMode) return false;
      }

      // Battery range filter
      if (device.battery_level !== null && device.battery_level !== undefined) {
        const battery = device.battery_level;
        if (battery < filters.batteryRange[0] || battery > filters.batteryRange[1]) {
          return false;
        }
      }

      return true;
    });
  }, [devices, filters]);

  const availableModes = useMemo(() => {
    const modes = devices.map(device => device.application_mode).filter(Boolean);
    return [...new Set(modes)];
  }, [devices]);

  if (loading) {
    return <LoadingSkeleton type="list" count={6} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-end items-center">
          <div className="flex gap-2">
            <Button onClick={fetchDevices} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {(role === 'admin' || role === 'moderator') && (
              <Button size="sm" variant={layout === 'modern' ? 'default' : 'outline'}>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            )}
          </div>
        </div>

        <DeviceFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableModes={availableModes}
        />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => {
          const location = deviceLocations[device.devid];
          
          if (layout === 'modern') {
            // Enhanced modern layout with glass morphism and gradients
            return (
              <Card key={device.devid} className="group relative overflow-hidden border-t-4 border-t-red-500 hover:shadow-md shadow-sm transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="relative">
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
                          <Button size="sm" onClick={handleSaveEdit} className="bg-green-500 hover:bg-green-600">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {device.name || device.devid}
                          </CardTitle>
                          {(role === 'admin' || role === 'moderator') && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditClick(device)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      <CardDescription className="font-mono text-xs">ID: {device.devid}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(device.devid)}
                      {device.battery_level && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-xs">🔋 Battery</span>
                          <div className="flex items-center gap-2">
                            <Battery 
                              level={device.battery_level} 
                              size="md"
                              className={getBatteryColor(device.battery_level)}
                            />
                            <span className={`font-medium text-xs ${getBatteryColor(device.battery_level)}`}>
                              {device.battery_level}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative space-y-3">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {role === 'admin' && (
                      <div className="bg-background/20 backdrop-blur-sm rounded-lg p-3 space-y-1">
                        <p className="text-muted-foreground"><span className="font-medium text-foreground">HW:</span> {device.hw_version}</p>
                        <p className="text-muted-foreground"><span className="font-medium text-foreground">SW:</span> {device.sw_version}</p>
                        {device.iccid && <p className="text-muted-foreground font-mono text-xs"><span className="font-medium text-foreground">ICCID:</span> {device.iccid}</p>}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Mode:</span>
                      {(role === 'admin' || role === 'moderator') ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-3 text-sm font-normal bg-background/50 backdrop-blur-sm border-border/50 hover:bg-primary/10">
                              {device.application_mode || 'Select'}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-background/95 backdrop-blur-md border-border/50">
                            {applicationModes.map((mode) => (
                              <DropdownMenuItem
                                key={mode}
                                onClick={() => updateDeviceMode(device.devid, mode)}
                                className="hover:bg-primary/10 cursor-pointer capitalize"
                              >
                                {mode}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge variant="secondary" className="capitalize bg-background/50 backdrop-blur-sm">
                          {device.application_mode}
                        </Badge>
                      )}
                    </div>
                    
                    {device.heartbeat_interval && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Heartbeat:</span>
                        <span className="text-muted-foreground">{device.heartbeat_interval}s</span>
                      </div>
                    )}
                  </div>
                  
                  {location && location.data && typeof location.data === 'object' && location.data.accuracy && (
                    <div className="bg-primary/5 backdrop-blur-sm rounded-lg p-3 border border-primary/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">Location Accuracy:</span>
                        <span className="text-primary font-medium">{parseFloat(location.data.accuracy).toFixed(2)}m</span>
                      </div>
                    </div>
                  )}
                  
                  {device.last_seen && (
                    <div className="border-t border-border/30 pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">Last Seen:</span>
                        <span className="text-muted-foreground font-mono text-xs">{formatDanishTime(device.last_seen)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }
          
          // Classic layout - keep original styling exactly as it was
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
                        <Battery 
                          level={device.battery_level} 
                          size="sm"
                          className={getBatteryColor(device.battery_level)}
                        />
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
                  {role === 'admin' && (
                    <>
                      <p><strong>HW Version:</strong> {device.hw_version}</p>
                      <p><strong>SW Version:</strong> {device.sw_version}</p>
                      {device.iccid && <p><strong>ICCID:</strong> {device.iccid}</p>}
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <strong>Mode:</strong>
                    {(role === 'admin' || role === 'moderator') ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 px-2 text-sm font-normal">
                            {device.application_mode || 'Select'}
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background border shadow-md">
                          {applicationModes.map((mode) => (
                            <DropdownMenuItem
                              key={mode}
                              onClick={() => updateDeviceMode(device.devid, mode)}
                              className="hover:bg-accent cursor-pointer"
                            >
                              {mode}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span>{device.application_mode}</span>
                    )}
                  </div>
                  {device.heartbeat_interval && (
                    <p><strong>Heartbeat:</strong> {device.heartbeat_interval}s</p>
                  )}
                </div>
                
                {location && location.data && typeof location.data === 'object' && location.data.accuracy && (
                  <div className="text-sm space-y-1 pt-2 border-t">
                    {location.data.accuracy && <p><strong>Accuracy:</strong> {parseFloat(location.data.accuracy).toFixed(2)}m</p>}
                  </div>
                )}
                
                {device.last_seen && (
                  <div className="text-sm pt-2 border-t">
                    <p><strong>Last Seen:</strong> {formatDanishTime(device.last_seen)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDevices.length === 0 && devices.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No devices found matching your search.</p>
        </div>
      )}

      {devices.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No devices found. Add your first device to get started.</p>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default DeviceList;