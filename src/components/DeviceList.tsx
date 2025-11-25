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
import { DeviceDetailsDialog } from './DeviceDetailsDialog';
import { useDeviceConfiguration } from '@/hooks/useDeviceConfiguration';
import { useDataTypeSelection } from '@/hooks/useDataTypeSelection';

interface DeviceConfig {
  devid: string;
  name: string;
  iccid: string;
  heartbeat_interval: number;
  sw_version: string;
  hw_version: string;
  location_mode: number;
  sensor_type: number;
  device_data_updated_at: string;
  last_seen: string;
  created_at: string;
  battery_level: number;
  apn: string | null;
  band: number | null;
  description: string | null;
  internal_temperature: number | null;
}

// Application mode mapping
export const APPLICATION_MODE_MAP: Record<number, string> = {
  0: 'None',
  1: 'Cell Tower',
  2: 'GPS',
  3: 'WiFi',
};

// Sensor type mapping
export const SENSOR_TYPE_MAP: Record<number, string> = {
  0: 'Not Configured',
  1: 'Tracker',
  2: 'Soil Sensor',
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('deviceViewMode');
    return (saved === 'grid' || saved === 'list') ? saved : 'grid';
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('deviceTableColumns');
    return saved ? JSON.parse(saved) : [
      'name', 'devid', 'hw_version', 'sw_version', 'iccid', 
      'apn', 'band', 'temperature', 'battery', 'heartbeat'
    ];
  });
  const [sortColumn, setSortColumn] = useState<string | null>('devid');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
  const [selectedDeviceForDetails, setSelectedDeviceForDetails] = useState<DeviceConfig | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { role, canModifyData } = useUserRole();
  const { getEnabledDataTypes } = useDataTypeSelection();
  const { getDeviceConfig } = useDeviceConfiguration();

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('deviceViewMode', viewMode);
  }, [viewMode]);

  // Persist visible columns to localStorage
  useEffect(() => {
    localStorage.setItem('deviceTableColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

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
        .update({ location_mode: newMode })
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
          description: "Failed to update reporting interval",
          variant: "destructive",
        });
        return;
      }

      setDevices(prev => prev.map(device => 
        device.devid === devid ? { ...device, heartbeat_interval: interval } : device
      ));
      
      toast({
        title: "Success",
        description: "Reporting interval updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reporting interval",
        variant: "destructive",
      });
    }
  };

  const updateSensorType = async (devid: string, sensorType: number) => {
    try {
      const { error } = await supabase
        .from('device_config')
        .update({ sensor_type: sensorType })
        .eq('devid', devid);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update sensor type",
          variant: "destructive",
        });
        return;
      }

      setDevices(prev => prev.map(device => 
        device.devid === devid ? { ...device, sensor_type: sensorType } : device
      ));
      
      toast({
        title: "Success",
        description: "Sensor type updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sensor type",
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

  const formatHeartbeat = (raw?: number | null) => {
    const s = Number(raw ?? 0);
    if (s <= 0) return "null";
    if (s >= 86400) return "24h";
    if (s >= 43200) return "12h";
    if (s >= 21600) return "6h";
    if (s >= 3600) return "1h";
    if (s >= 1800) return "30m";
    if (s >= 300) return "5m";
    if (s >= 60) return "1m";
    return `${s}s`;
  };

  const allColumns = [
    { id: 'name', label: 'Device Name' },
    { id: 'devid', label: 'Device ID' },
    { id: 'hw_version', label: 'Hardware Version' },
    { id: 'sw_version', label: 'Software Version' },
    { id: 'iccid', label: 'ICCID' },
    { id: 'apn', label: 'APN' },
    { id: 'band', label: 'Band' },
    { id: 'temperature', label: 'Temperature' },
    { id: 'battery', label: 'Battery Voltage' },
    { id: 'heartbeat', label: 'Heartbeat Interval' },
  ];

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const showAllColumns = () => {
    setVisibleColumns(allColumns.map(col => col.id));
  };

  const hideAllColumns = () => {
    setVisibleColumns([]);
  };

  // Apply filters to devices
  const filteredDevices = useMemo(() => {
    let result = devices.filter(device => {
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

      // Location mode filter
      if (filters.applicationMode !== 'all') {
        const modeNumber = parseInt(filters.applicationMode);
        if (device.location_mode !== modeNumber) return false;
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

    // Apply sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal: any = null;
        let bVal: any = null;

        switch (sortColumn) {
          case 'name':
            aVal = a.name || a.devid;
            bVal = b.name || b.devid;
            break;
          case 'devid':
            aVal = a.devid;
            bVal = b.devid;
            break;
          case 'hw_version':
            aVal = a.hw_version || '';
            bVal = b.hw_version || '';
            break;
          case 'sw_version':
            aVal = a.sw_version || '';
            bVal = b.sw_version || '';
            break;
          case 'iccid':
            aVal = a.iccid || '';
            bVal = b.iccid || '';
            break;
          case 'apn':
            aVal = a.apn || '';
            bVal = b.apn || '';
            break;
          case 'band':
            aVal = a.band || 0;
            bVal = b.band || 0;
            break;
          case 'temperature':
            aVal = a.internal_temperature || 0;
            bVal = b.internal_temperature || 0;
            break;
          case 'battery':
            aVal = a.battery_level || 0;
            bVal = b.battery_level || 0;
            break;
          case 'heartbeat':
            aVal = a.heartbeat_interval || 0;
            bVal = b.heartbeat_interval || 0;
            break;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else {
          return sortDirection === 'asc' 
            ? (aVal > bVal ? 1 : -1)
            : (bVal > aVal ? 1 : -1);
        }
      });
    }

    return result;
  }, [devices, filters, sortColumn, sortDirection]);

  const availableModes = useMemo(() => {
    const modes = devices.map(device => device.location_mode.toString()).filter(mode => mode !== null && mode !== undefined);
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
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          onToggleColumn={toggleColumn}
          onShowAllColumns={showAllColumns}
          onHideAllColumns={hideAllColumns}
        />

      {viewMode === 'grid' ? (
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
                onSensorTypeUpdate={updateSensorType}
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
                onDeviceUpdate={fetchDevices}
              />
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {visibleColumns.includes('name') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Device Name
                        {sortColumn === 'name' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('devid') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('devid')}
                    >
                      <div className="flex items-center gap-1">
                        Device ID
                        {sortColumn === 'devid' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('hw_version') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('hw_version')}
                    >
                      <div className="flex items-center gap-1">
                        Hardware Version
                        {sortColumn === 'hw_version' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('sw_version') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('sw_version')}
                    >
                      <div className="flex items-center gap-1">
                        Software Version
                        {sortColumn === 'sw_version' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('iccid') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('iccid')}
                    >
                      <div className="flex items-center gap-1">
                        ICCID
                        {sortColumn === 'iccid' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('apn') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('apn')}
                    >
                      <div className="flex items-center gap-1">
                        APN
                        {sortColumn === 'apn' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('band') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('band')}
                    >
                      <div className="flex items-center gap-1">
                        Band
                        {sortColumn === 'band' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('temperature') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('temperature')}
                    >
                      <div className="flex items-center gap-1">
                        Temperature
                        {sortColumn === 'temperature' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('battery') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('battery')}
                    >
                      <div className="flex items-center gap-1">
                        Battery Voltage
                        {sortColumn === 'battery' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('heartbeat') && (
                    <th 
                      className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted/70 select-none"
                      onClick={() => handleSort('heartbeat')}
                    >
                      <div className="flex items-center gap-1">
                        Heartbeat Interval
                        {sortColumn === 'heartbeat' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => (
                  <tr 
                    key={device.devid} 
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedDeviceForDetails(device);
                      setIsDetailsDialogOpen(true);
                    }}
                  >
                    {visibleColumns.includes('name') && (
                      <td className="p-3 text-sm">{device.name || '-'}</td>
                    )}
                    {visibleColumns.includes('devid') && (
                      <td className="p-3 text-sm font-mono">{device.devid}</td>
                    )}
                    {visibleColumns.includes('hw_version') && (
                      <td className="p-3 text-sm font-mono">{device.hw_version || 'N/A'}</td>
                    )}
                    {visibleColumns.includes('sw_version') && (
                      <td className="p-3 text-sm font-mono">{device.sw_version || 'N/A'}</td>
                    )}
                    {visibleColumns.includes('iccid') && (
                      <td className="p-3 text-sm font-mono">{device.iccid || 'N/A'}</td>
                    )}
                    {visibleColumns.includes('apn') && (
                      <td className="p-3 text-sm font-mono">{device.apn || 'N/A'}</td>
                    )}
                    {visibleColumns.includes('band') && (
                      <td className="p-3 text-sm font-mono">{device.band || 'N/A'}</td>
                    )}
                    {visibleColumns.includes('temperature') && (
                      <td className="p-3 text-sm">
                        {device.internal_temperature !== null ? `${device.internal_temperature}°C` : 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('battery') && (
                      <td className="p-3 text-sm">
                        {device.battery_level !== null ? `${(device.battery_level / 1000).toFixed(3)} V` : 'N/A'}
                      </td>
                    )}
                    {visibleColumns.includes('heartbeat') && (
                      <td className="p-3 text-sm">{formatHeartbeat(device.heartbeat_interval)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

        {/* Device Details Dialog (for list view) */}
        {selectedDeviceForDetails && (
          <DeviceDetailsDialog
            open={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
            device={selectedDeviceForDetails}
            role={role}
            onDeviceUpdate={fetchDevices}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DeviceList;