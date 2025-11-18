import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Database, Send, Save } from 'lucide-react';
import { useDeviceConfiguration } from '@/hooks/useDeviceConfiguration';
import { useDataForwarding } from '@/hooks/useDataForwarding';
import { useDataTypeSelection } from '@/hooks/useDataTypeSelection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface DeviceConfigDialogProps {
  deviceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const SENSOR_TYPES = [
  { value: 1, label: 'Tracker' },
  { value: 2, label: 'Soil Sensor' }
];

const LOCATION_MODES = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Cell Tower' },
  { value: 2, label: 'GNSS' },
  { value: 3, label: 'WiFi' }
];

const DeviceConfigDialog: React.FC<DeviceConfigDialogProps> = ({
  deviceId,
  isOpen,
  onClose
}) => {
  const { getDeviceConfig, toggleDataType, toggleEndpoint, toggleForwarding } = useDeviceConfiguration();
  const { endpoints } = useDataForwarding();
  const { availableDataTypes } = useDataTypeSelection();
  
  const [deviceName, setDeviceName] = useState('');
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(60);
  const [sensorType, setSensorType] = useState<number>(0);
  const [locationMode, setLocationMode] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch device config from database
  useEffect(() => {
    if (!deviceId || !isOpen) return;
    
    const fetchDeviceConfig = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('device_config')
          .select('name, heartbeat_interval, sensor_type, location_mode')
          .eq('devid', deviceId)
          .single();

        if (error) throw error;

        if (data) {
          setDeviceName(data.name || '');
          setHeartbeatInterval(data.heartbeat_interval || 60);
          setSensorType(data.sensor_type || 0);
          setLocationMode(data.location_mode || 0);
        }
      } catch (error) {
        console.error('Error fetching device config:', error);
        toast({
          title: 'Error',
          description: 'Failed to load device configuration',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeviceConfig();
  }, [deviceId, isOpen]);

  const handleSaveSettings = async () => {
    if (!deviceId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('device_config')
        .update({
          name: deviceName || null,
          heartbeat_interval: heartbeatInterval,
          sensor_type: sensorType,
          location_mode: locationMode
        })
        .eq('devid', deviceId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Device settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving device config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save device settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!deviceId) return null;

  const config = getDeviceConfig(deviceId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Device
          </DialogTitle>
          <DialogDescription>
            Configure device settings, data display options, and forwarding endpoints
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Enter device name"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heartbeat-interval">Heartbeat Interval (seconds)</Label>
              <Input
                id="heartbeat-interval"
                type="number"
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(parseInt(e.target.value) || 60)}
                min="10"
                max="86400"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sensor-type">Sensor Type</Label>
              <Select 
                value={sensorType.toString()} 
                onValueChange={(value) => setSensorType(parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger id="sensor-type">
                  <SelectValue placeholder="Select sensor type" />
                </SelectTrigger>
                <SelectContent>
                  {SENSOR_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value.toString()}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="forwarding-enabled">Enable data forwarding</Label>
              <Switch
                id="forwarding-enabled"
                checked={config.forwardingEnabled}
                onCheckedChange={() => toggleForwarding(deviceId)}
              />
            </div>

            {/* Conditional fields based on sensor type */}
            {sensorType === 1 && (
              <div className="space-y-2">
                <Label htmlFor="location-mode">Location Mode</Label>
                <Select 
                  value={locationMode.toString()} 
                  onValueChange={(value) => setLocationMode(parseInt(value))}
                  disabled={isLoading}
                >
                  <SelectTrigger id="location-mode">
                    <SelectValue placeholder="Select location mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_MODES.map(mode => (
                      <SelectItem key={mode.value} value={mode.value.toString()}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleSaveSettings} 
                disabled={isSaving || isLoading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>

          {/* Data Display Configuration - Only show for Soil Sensor */}
          {sensorType === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-4 w-4" />
                  Data Points to Display
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {availableDataTypes.map(dataType => (
                    <div key={dataType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`display-${dataType}`}
                        checked={config.enabledDataTypes.includes(dataType)}
                        onCheckedChange={() => toggleDataType(deviceId, dataType)}
                      />
                      <Label htmlFor={`display-${dataType}`} className="text-sm capitalize">
                        {dataType.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
                {availableDataTypes.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No data types available. Sensor data will appear automatically.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Forwarding Endpoints - Show when forwarding is enabled */}
          {config.forwardingEnabled && (
            <div className="space-y-3">
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Forwarding Endpoints
                </Label>
                {endpoints.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No endpoints configured. Add endpoints in the Data Forwarding settings.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {endpoints.map(endpoint => (
                      <div key={endpoint.id} className="flex items-center justify-between p-3 rounded border bg-background/50">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`endpoint-${endpoint.id}`}
                            checked={config.selectedEndpoints.includes(endpoint.id)}
                            onCheckedChange={() => toggleEndpoint(deviceId, endpoint.id)}
                            disabled={!endpoint.enabled}
                          />
                          <div>
                            <Label htmlFor={`endpoint-${endpoint.id}`} className="font-medium">
                              {endpoint.name}
                            </Label>
                            <p className="text-xs text-muted-foreground font-mono">
                              {endpoint.url}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={endpoint.enabled ? 'default' : 'secondary'} className="text-xs">
                            {endpoint.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {config.selectedEndpoints.length > 0 && sensorType === 2 && (
                <div className="bg-primary/5 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Data types to forward:</strong>{' '}
                    {config.enabledDataTypes.join(', ') || 'None selected'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceConfigDialog;