import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Database, Send } from 'lucide-react';
import { useDeviceConfiguration } from '@/hooks/useDeviceConfiguration';
import { useDataForwarding } from '@/hooks/useDataForwarding';
import { useDataTypeSelection } from '@/hooks/useDataTypeSelection';

interface DeviceConfigDialogProps {
  deviceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const DeviceConfigDialog: React.FC<DeviceConfigDialogProps> = ({
  deviceId,
  isOpen,
  onClose
}) => {
  const { getDeviceConfig, toggleDataType, toggleEndpoint, toggleForwarding } = useDeviceConfiguration();
  const { endpoints } = useDataForwarding();
  const { availableDataTypes } = useDataTypeSelection();

  if (!deviceId) return null;

  const config = getDeviceConfig(deviceId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Device: {deviceId}
          </DialogTitle>
          <DialogDescription>
            Choose what data to display and which endpoints to forward data to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Data Display Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-4 w-4" />
                Data Display
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

          {/* Data Forwarding Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-4 w-4" />
                Data Forwarding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="forwarding-enabled">Enable data forwarding</Label>
                <Switch
                  id="forwarding-enabled"
                  checked={config.forwardingEnabled}
                  onCheckedChange={() => toggleForwarding(deviceId)}
                />
              </div>

              {config.forwardingEnabled && (
                <>
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium mb-3 block">
                      Select endpoints to forward data to:
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

                  {config.selectedEndpoints.length > 0 && (
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>Data types to forward:</strong>{' '}
                        {config.enabledDataTypes.join(', ') || 'None selected'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceConfigDialog;