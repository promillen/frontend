import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { RefreshCw, Plus, Edit2, Check, X, ChevronDown, Smartphone, MapPin, Clock, Zap } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import DeviceFiltersComponent, { DeviceFilters } from './DeviceFilters';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorBoundary from './ErrorBoundary';

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
  data: any;
  created_at: string;
}

const DeviceList = () => {
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [latestLocations, setLatestLocations] = useState<{ [key: string]: LocationSensorData }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [filters, setFilters] = useState<DeviceFilters>({
    search: '',
    status: 'all',
    applicationMode: 'all',
    batteryRange: [0, 100],
    dateRange: {},
  });
  const { toast } = useToast();
  const { role } = useUserRole();

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: deviceData, error: deviceError } = await supabase
        .from('device_config')
        .select('*')
        .order('name');

      if (deviceError) {
        setError('Failed to fetch devices');
        console.error('Error fetching devices:', deviceError);
        toast({
          title: "Error",
          description: "Failed to fetch devices",
          variant: "destructive",
        });
        return;
      }

      setDevices(deviceData || []);

      // Fetch latest location data for each device
      const { data: locationData, error: locationError } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('data_type', 'location')
        .order('created_at', { ascending: false });

      if (locationError) {
        console.error('Error fetching locations:', locationError);
      } else {
        const latestByDevice = (locationData || []).reduce((acc, location) => {
          if (!acc[location.devid] || new Date(location.created_at) > new Date(acc[location.devid].created_at)) {
            acc[location.devid] = location;
          }
          return acc;
        }, {} as { [key: string]: LocationSensorData });
        
        setLatestLocations(latestByDevice);
      }
    } catch (err) {
      setError('Failed to fetch devices');
      console.error('Error fetching devices:', err);
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
    setEditingName(device.name || device.devid);
  };

  const handleSaveEdit = async () => {
    if (editingDevice && editingName.trim()) {
      await updateDeviceName(editingDevice, editingName.trim());
      setEditingDevice(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingDevice(null);
    setEditingName('');
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

  const getStatusBadge = (device: DeviceConfig) => {
    if (!device?.last_seen) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          No Data
        </Badge>
      );
    }

    const status = getDeviceStatus(device.last_seen);
    
    if (status === 'online') {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Online
        </Badge>
      );
    } else if (status === 'warning') {
      return (
        <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          Warning
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          Offline
        </Badge>
      );
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

  // Get unique application modes for filter dropdown
  const availableModes = useMemo(() => {
    const modes = devices
      .map(device => device.application_mode)
      .filter((mode): mode is string => Boolean(mode));
    return [...new Set(modes)];
  }, [devices]);

  if (loading) {
    return <LoadingSkeleton type="list" count={6} />;
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Unable to load devices</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={fetchDevices}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Device Management</h1>
            <p className="text-muted-foreground mt-1">Manage and monitor your IoT devices</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={fetchDevices} variant="outline" size="sm" className="layout-transition hover:scale-105">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {(role === 'admin' || role === 'moderator') && (
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 layout-transition hover:scale-105">
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

        {filteredDevices.length === 0 ? (
          <Card className="p-8 text-center shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto flex items-center justify-center shadow-sm">
                <Smartphone className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No devices found</h3>
                <p className="text-muted-foreground">
                  {filters.search || filters.status !== 'all' || filters.applicationMode !== 'all' 
                    ? 'Try adjusting your filters or search terms.' 
                    : 'Get started by adding your first device.'}
                </p>
              </div>
              {(role === 'admin' || role === 'moderator') && !filters.search && (
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Device
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDevices.map(device => {
              const location = latestLocations[device.devid];
              const isEditing = editingDevice === device.devid;

              return (
                <Card 
                  key={device.devid} 
                  className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 overflow-hidden relative"
                >
                  {/* Status indicator line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    getDeviceStatus(device.last_seen) === 'online' ? 'bg-green-500' :
                    getDeviceStatus(device.last_seen) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8 text-sm font-medium border-blue-200 focus:border-blue-500"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSaveEdit}
                                className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-200"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                                  {device.name || device.devid}
                                </CardTitle>
                                {(role === 'admin' || role === 'moderator') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditClick(device)}
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <CardDescription className="text-xs truncate font-mono">
                                ID: {device.devid}
                              </CardDescription>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getStatusBadge(device)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Battery Level with Progress Bar */}
                    {device.battery_level !== null && device.battery_level !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="font-medium">Battery</span>
                          </div>
                          <span className={`font-bold ${getBatteryColor(device.battery_level)}`}>
                            {device.battery_level}%
                          </span>
                        </div>
                        <Progress 
                          value={device.battery_level} 
                          className="h-2 bg-gray-100"
                          style={{
                            '--progress-foreground': device.battery_level >= 60 ? '#10b981' : 
                                                   device.battery_level >= 30 ? '#f59e0b' : '#ef4444'
                          } as React.CSSProperties}
                        />
                      </div>
                    )}

                    {/* Location Info */}
                    {location && (
                      <div className="flex items-center space-x-2 text-xs bg-green-50 p-2 rounded-lg border border-green-100">
                        <MapPin className="w-3 h-3 text-green-600" />
                        <span className="text-green-700 font-medium">
                          Located: {formatDanishTime(location.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Last Activity */}
                    {device.last_seen && (
                      <div className="flex items-center space-x-2 text-xs bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span className="text-blue-700 font-medium">
                          Active: {formatDanishTime(device.last_seen)}
                        </span>
                      </div>
                    )}

                    {/* Device Info Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Hardware</span>
                        <div className="font-medium truncate text-gray-900">{device.hw_version || 'N/A'}</div>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground block">Software</span>
                        <div className="font-medium truncate text-gray-900">{device.sw_version || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Application Mode */}
                    {(role === 'admin' || role === 'moderator') && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-muted-foreground font-medium">Mode:</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 text-xs font-normal hover:bg-blue-50 hover:border-blue-200 transition-colors"
                            >
                              {device.application_mode || 'Select'}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            {applicationModes.map(mode => (
                              <DropdownMenuItem
                                key={mode}
                                onClick={() => updateDeviceMode(device.devid, mode)}
                                className="text-xs hover:bg-blue-50 cursor-pointer"
                              >
                                {mode}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DeviceList;