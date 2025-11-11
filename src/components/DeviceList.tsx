import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { formatInTimeZone } from 'date-fns-tz';
import DeviceFiltersComponent, { DeviceFilters } from './DeviceFilters';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorBoundary from './ErrorBoundary';
import DeviceCard from './DeviceCard';
import DeviceLogViewer from './DeviceLogViewer';
import DeviceConfigDialog from './DeviceConfigDialog';
import { useDeviceConfiguration } from '@/hooks/useDeviceConfiguration';
import { useDataTypeSelection } from '@/hooks/useDataTypeSelection';

interface DeviceConfig {
  devid: string;
  name: string;
  iccid: string;
  heartbeat_interval: number;
  sw_version: string;
  hw_version: string;
  application_mode: number;
  device_data_updated_at: string;
  last_seen: string;
  created_at: string;
  battery_level: number;
}

// Application mode mapping
export const APPLICATION_MODE_MAP: Record<number, string> = {
  0: 'None',
  1: 'Cell Tower',
  2: 'GPS',
  3: 'WiFi',
};

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
  const [selectedDeviceForLogs, setSelectedDeviceForLogs] = useState<string | null>(null);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [selectedDeviceForConfig, setSelectedDeviceForConfig] = useState<string | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const { toast } = useToast();
  const { role, canModifyData } = useUserRole();
  const { getEnabledDataTypes } = useDataTypeSelection();
  const { getDeviceConfig } = useDeviceConfiguration();

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

  const updateDeviceMode = async (devid: string, newMode: number) => {
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

  const updateHeartbeatInterval = async (devid: string, interval: number) => {
    try {
      const { error } = await supabase
        .from('device_config')
        .update({ heartbeat_interval: interval })
        .eq('devid', devid);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update heartbeat interval",
          variant: "destructive",
        });
        return;
      }

      setDevices(prev => prev.map(device => 
        device.devid === devid ? { ...device, heartbeat_interval: interval } : device
      ));
      
      toast({
        title: "Success",
        description: "Heartbeat interval updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update heartbeat interval",
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

  const getDeviceStatus = (lastSeen: string | null, heartbeatSeconds: number | null): 'online' | 'warning' | 'offline' => {
    // Guard clause: if either value is missing, mark as offline
    if (!lastSeen || !heartbeatSeconds) return 'offline';

    const lastUpdate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    const heartbeatMinutes = heartbeatSeconds / 60;

    if (diffMinutes <= heartbeatMinutes) return 'online';
    if (diffMinutes <= heartbeatMinutes * 2) return 'warning';
    return 'offline';
  };

  const getStatusBadge = (deviceId: string) => {
    const device = devices.find(d => d.devid === deviceId);
    if (!device?.last_seen) {
      return <Badge variant="secondary">No Data</Badge>;
    }

    const status = getDeviceStatus(device.last_seen, device.heartbeat_interval);
    
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
        const status = getDeviceStatus(device.last_seen, device.heartbeat_interval);
        if (status !== filters.status) return false;
      }

      // Application mode filter
      if (filters.applicationMode !== 'all') {
        const modeNumber = parseInt(filters.applicationMode);
        if (device.application_mode !== modeNumber) return false;
      }

      // Battery filter: only apply when battery is a percentage (0-100)
      if (device.battery_level !== null && device.battery_level !== undefined) {
        const battery = device.battery_level;
        const isPercent = battery >= 0 && battery <= 100;
        if (isPercent) {
          if (battery < filters.batteryRange[0] || battery > filters.batteryRange[1]) {
            return false;
          }
        }
      }

      return true;
    });
  }, [devices, filters]);

  const availableModes = useMemo(() => {
    const modes = devices.map(device => device.application_mode.toString()).filter(mode => mode !== null && mode !== undefined);
    return [...new Set(modes)];
  }, [devices]);

  if (loading) {
    return <LoadingSkeleton type="list" count={6} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <DeviceFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableModes={availableModes}
          onRefresh={fetchDevices}
          canAddDevice={role === 'admin' || role === 'moderator' || role === 'developer'}
        />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => {
          const deviceConfig = getDeviceConfig(device.devid);
          return (
            <DeviceCard
              key={device.devid}
              device={device}
              enabledDataTypes={deviceConfig.enabledDataTypes}
              role={role}
              editingDevice={editingDevice}
              editName={editName}
              onEditClick={handleEditClick}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onNameChange={setEditName}
              onModeUpdate={updateDeviceMode}
              onHeartbeatUpdate={updateHeartbeatInterval}
              onViewLogs={(devid) => {
                setSelectedDeviceForLogs(devid);
                setIsLogViewerOpen(true);
              }}
              onConfigureDevice={(devid) => {
                setSelectedDeviceForConfig(devid);
                setIsConfigDialogOpen(true);
              }}
              getStatusBadge={getStatusBadge}
              getBatteryColor={getBatteryColor}
              isLogViewerOpen={selectedDeviceForLogs === device.devid && isLogViewerOpen}
              isConfigDialogOpen={selectedDeviceForConfig === device.devid && isConfigDialogOpen}
            />
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
        
        {/* Device Configuration Dialog */}
        <DeviceConfigDialog
          deviceId={selectedDeviceForConfig}
          isOpen={isConfigDialogOpen}
          onClose={() => {
            setIsConfigDialogOpen(false);
            setSelectedDeviceForConfig(null);
          }}
        />
        
        {/* Device Log Viewer */}
        <DeviceLogViewer
          deviceId={selectedDeviceForLogs}
          isOpen={isLogViewerOpen}
          onClose={() => {
            setIsLogViewerOpen(false);
            setSelectedDeviceForLogs(null);
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default DeviceList;