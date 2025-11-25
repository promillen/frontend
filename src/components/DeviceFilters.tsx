import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Filter, X, RotateCcw, RefreshCw, Plus, LayoutGrid, List, Columns } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const LOCATION_MODE_MAP: Record<number, string> = {
  0: 'None',
  1: 'GNSS',
  2: 'WiFi'
};

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
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  visibleColumns: string[];
  allColumns: { id: string; label: string }[];
  onToggleColumn: (columnId: string) => void;
}

const DeviceFiltersComponent = ({ filters, onFiltersChange, availableModes, onRefresh, canAddDevice, viewMode, onViewModeChange, visibleColumns, allColumns, onToggleColumn }: DeviceFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  const resetFilters = () => {
    const defaultFilters: DeviceFilters = {
      search: '',
      status: 'all',
      applicationMode: 'all',
      batteryRange: [0, 100],
      dateRange: {},
    };
    onFiltersChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.applicationMode !== 'all') count++;
    if (filters.batteryRange[0] > 0 || filters.batteryRange[1] < 100) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
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
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {viewMode === 'list' && (
              <Popover open={isColumnSelectorOpen} onOpenChange={setIsColumnSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm mb-3">Select Columns</h4>
                    {allColumns.map((column) => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.id}
                          checked={visibleColumns.includes(column.id)}
                          onCheckedChange={() => onToggleColumn(column.id)}
                        />
                        <label
                          htmlFor={column.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {column.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
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
                    value={filters.status}
                    onValueChange={(value: any) => onFiltersChange({ ...filters, status: value })}
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
                    value={filters.applicationMode}
                    onValueChange={(value) => onFiltersChange({ ...filters, applicationMode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modes</SelectItem>
                      {availableModes.map(mode => (
                        <SelectItem key={mode} value={mode}>
                          {LOCATION_MODE_MAP[parseInt(mode)] || mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Battery Level Range</Label>
                  <div className="px-3 py-2">
                    <Slider
                      value={filters.batteryRange}
                      onValueChange={(value) => onFiltersChange({ ...filters, batteryRange: value as [number, number] })}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{filters.batteryRange[0]}%</span>
                      <span>{filters.batteryRange[1]}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default DeviceFiltersComponent;