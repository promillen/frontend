import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit2, Check, X, ChevronDown, Database, Send, Settings } from 'lucide-react';
import { Battery } from '@/components/ui/battery';
import { formatInTimeZone } from 'date-fns-tz';
import { useSensorData } from '@/hooks/useSensorData';
import { useDataForwarding } from '@/hooks/useDataForwarding';

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

interface DeviceCardProps {
  device: DeviceConfig;
  enabledDataTypes: string[];
  role: string;
  editingDevice: string | null;
  editName: string;
  applicationModes: string[];
  onEditClick: (device: DeviceConfig) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onNameChange: (name: string) => void;
  onModeUpdate: (devid: string, mode: string) => void;
  onViewLogs: (devid: string) => void;
  onConfigureDevice: (devid: string) => void;
  getStatusBadge: (deviceId: string) => React.ReactNode;
  getBatteryColor: (level: number) => string;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  enabledDataTypes,
  role,
  editingDevice,
  editName,
  applicationModes,
  onEditClick,
  onSaveEdit,
  onCancelEdit,
  onNameChange,
  onModeUpdate,
  onViewLogs,
  onConfigureDevice,
  getStatusBadge,
  getBatteryColor
}) => {
  const { sensorData, loading: sensorLoading } = useSensorData(device.devid, enabledDataTypes);
  const { forwardData, isForwarding } = useDataForwarding();

  const formatDanishTime = (dateString: string) => {
    return formatInTimeZone(new Date(dateString), 'Europe/Copenhagen', 'dd/MM/yyyy HH:mm:ss');
  };

  const handleForwardData = async () => {
    const dataToForward: Record<string, any> = {};
    
    // Collect all sensor data for forwarding
    Object.entries(sensorData).forEach(([dataType, data]) => {
      dataToForward[dataType] = data.data;
    });

    if (Object.keys(dataToForward).length > 0) {
      await forwardData(device.devid, dataToForward);
    }
  };

  const renderSensorValue = (dataType: string, data: any) => {
    if (!data) return 'No data';

    // Handle different data types with appropriate formatting
    switch (dataType) {
      case 'temperature':
        if (typeof data === 'object' && data.temperature !== undefined) {
          return `${data.temperature}°C`;
        }
        return typeof data === 'number' ? `${data}°C` : 'Invalid data';
      
      case 'location':
        if (typeof data === 'object' && data.latitude && data.longitude) {
          return `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
        }
        return 'Invalid location';
      
      case 'ph':
        return typeof data === 'number' ? `pH ${data.toFixed(2)}` : data.ph ? `pH ${data.ph.toFixed(2)}` : 'Invalid pH';
      
      case 'soil_moisture':
        return typeof data === 'number' ? `${data}%` : data.moisture ? `${data.moisture}%` : 'Invalid moisture';
      
      case 'humidity':
        return typeof data === 'number' ? `${data}%` : data.humidity ? `${data.humidity}%` : 'Invalid humidity';
      
      case 'pressure':
        return typeof data === 'number' ? `${data} hPa` : data.pressure ? `${data.pressure} hPa` : 'Invalid pressure';
      
      default:
        // Generic handling for unknown data types
        if (typeof data === 'object') {
          return JSON.stringify(data, null, 1);
        }
        return String(data);
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'temperature': return '🌡️';
      case 'location': return '📍';
      case 'ph': return '🧪';
      case 'soil_moisture': return '💧';
      case 'humidity': return '💨';
      case 'pressure': return '🔽';
      default: return '📊';
    }
  };

  return (
    <Card className="group relative overflow-hidden border-t-4 border-t-red-500 hover:shadow-md shadow-sm transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {editingDevice === device.devid ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="text-lg font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveEdit();
                    if (e.key === 'Escape') onCancelEdit();
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={onSaveEdit} className="bg-green-500 hover:bg-green-600">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
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
                    onClick={() => onEditClick(device)}
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
            <div className="flex items-center gap-2">
              <Battery 
                level={device.battery_level ?? 0} 
                size="md"
                className={device.battery_level ? getBatteryColor(device.battery_level) : 'text-muted-foreground'}
              />
              <span className={`font-medium text-xs ${device.battery_level ? getBatteryColor(device.battery_level) : 'text-muted-foreground'}`}>
                {device.battery_level ?? '?'}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-3">
        {/* Sensor Data Section */}
        {enabledDataTypes.length > 0 && (
          <div className="bg-primary/5 backdrop-blur-sm rounded-lg p-3 border border-primary/10">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Sensor Data</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleForwardData}
                disabled={isForwarding || Object.keys(sensorData).length === 0}
                className="h-6 px-2 text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                Forward
              </Button>
            </div>
            {sensorLoading ? (
              <p className="text-xs text-muted-foreground">Loading sensor data...</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {enabledDataTypes.map(dataType => {
                  const data = sensorData[dataType];
                  return (
                    <div key={dataType} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span>{getDataTypeIcon(dataType)}</span>
                        <span className="font-medium capitalize">
                          {dataType.replace('_', ' ')}:
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono">
                          {data ? renderSensorValue(dataType, data.data) : 'No data'}
                        </span>
                        {data && (
                          <div className="text-muted-foreground text-xs">
                            {formatDanishTime(data.created_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

          <div className="grid grid-cols-1 gap-3 text-sm">
          {role === 'developer' && (
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
                      onClick={() => onModeUpdate(device.devid, mode)}
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
        
         {device.last_seen && (
           <div className="border-t border-border/30 pt-3">
             <div className="flex items-center justify-between text-sm">
               <span className="font-medium text-foreground">Last Seen:</span>
               <span className="text-muted-foreground font-mono text-xs">{formatDanishTime(device.last_seen)}</span>
             </div>
           </div>
         )}
         
         {(role === 'moderator' || role === 'developer' || role === 'admin') && (
           <div className="border-t border-border/30 pt-3 space-y-2">
             {/* Device Configuration Button (Moderator, Admin, and Developer) */}
             {(role === 'moderator' || role === 'admin' || role === 'developer') && (
               <Button 
                 size="sm" 
                 variant="outline" 
                 onClick={() => onConfigureDevice(device.devid)}
                 className="w-full bg-primary/5 hover:bg-primary/10 border-primary/20"
               >
                 <Settings className="h-4 w-4 mr-2" />
                 Configure Device
               </Button>
             )}
             
             {/* Live Logs Button (Developer only) */}
             {role === 'developer' && (
               <Button 
                 size="sm" 
                 variant="outline" 
                 onClick={() => onViewLogs(device.devid)}
                 className="w-full bg-secondary/5 hover:bg-secondary/10 border-secondary/20"
               >
                  <Database className="h-4 w-4 mr-2" />
                  View Device Logs
               </Button>
             )}
           </div>
         )}
      </CardContent>
    </Card>
  );
};

export default DeviceCard;