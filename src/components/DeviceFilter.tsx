import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Device {
  devid: string;
  name: string | null;
}

interface DeviceFilterProps {
  selectedDevices: string[];
  onDeviceToggle: (deviceId: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const DeviceFilter: React.FC<DeviceFilterProps> = ({
  selectedDevices,
  onDeviceToggle,
  onSelectAll,
  onSelectNone,
  isOpen,
  onToggle
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('device_config')
        .select('devid, name')
        .order('name');

      if (error) {
        console.error('Error fetching devices:', error);
        return;
      }

      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {!isOpen ? (
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur-sm hover:bg-accent border-border h-8 px-3 shadow-sm"
        >
          <Filter className="h-4 w-4 mr-2" />
          <span className="text-sm">Filter Devices</span>
        </Button>
      ) : (
        <>
          <Button
            onClick={onToggle}
            variant="outline"
            size="sm"
            className="bg-background/95 backdrop-blur-sm hover:bg-accent border-border h-8 px-3 shadow-sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span className="text-sm">Filter Devices</span>
          </Button>
          <Card className="absolute top-12 right-0 z-[999] w-80 bg-background border shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Filter Devices</CardTitle>
                <Button variant="ghost" size="sm" onClick={onToggle}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading devices...</div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={onSelectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={onSelectNone}>
                      Select None
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {devices.map((device) => (
                      <div key={device.devid} className="flex items-center space-x-2">
                        <Checkbox
                          id={device.devid}
                          checked={selectedDevices.includes(device.devid)}
                          onCheckedChange={() => onDeviceToggle(device.devid)}
                        />
                        <label
                          htmlFor={device.devid}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {device.name || device.devid}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {selectedDevices.length} of {devices.length} devices selected
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DeviceFilter;