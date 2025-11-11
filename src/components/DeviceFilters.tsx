import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Filter, X, RotateCcw, RefreshCw, Plus } from 'lucide-react';
import { APPLICATION_MODE_MAP } from './DeviceList';

export interface DeviceFilters {
  search: string;
  status: 'all' | 'online' | 'warning' | 'offline';
  applicationMode: string;
  batteryRange: [number, number];
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

interface DeviceFiltersProps {
  filters: DeviceFilters;
  onFiltersChange: (filters: DeviceFilters) => void;
  availableModes: string[];
  onRefresh: () => void;
  canAddDevice: boolean;
}

const DeviceFiltersComponent = ({ filters, onFiltersChange, availableModes, onRefresh, canAddDevice }: DeviceFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const resetFilters = () => {
    const defaultFilters: DeviceFilters = {
      search: '',
      status: 'all',
      applicationMode: 'all',
      batteryRange: [0, 100],
      dateRange: {},
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.status !== 'all') count++;
    if (localFilters.applicationMode !== 'all') count++;
    if (localFilters.batteryRange[0] > 0 || localFilters.batteryRange[1] < 100) count++;
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search devices by name, ID, or ICCID..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </CollapsibleTrigger>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {canAddDevice && (
              <Button size="sm" variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Advanced Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Device Status</Label>
                  <Select
                    value={localFilters.status}
                    onValueChange={(value: any) => setLocalFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Application Mode</Label>
                  <Select
                    value={localFilters.applicationMode}
                    onValueChange={(value) => setLocalFilters(prev => ({ ...prev, applicationMode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modes</SelectItem>
                      {availableModes.map(mode => (
                        <SelectItem key={mode} value={mode}>
                          {APPLICATION_MODE_MAP[parseInt(mode)] || mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Battery Level Range</Label>
                  <div className="px-3 py-2">
                    <Slider
                      value={localFilters.batteryRange}
                      onValueChange={(value) => setLocalFilters(prev => ({ ...prev, batteryRange: value as [number, number] }))}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{localFilters.batteryRange[0]}%</span>
                      <span>{localFilters.batteryRange[1]}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setLocalFilters(filters)}>
                  Cancel
                </Button>
                <Button onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default DeviceFiltersComponent;