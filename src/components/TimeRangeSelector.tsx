import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, X } from 'lucide-react';
import SimpleDropdown from './SimpleDropdown';

export interface TimeRange {
  id: string;
  label: string;
  hours: number;
}

export const TIME_RANGES: TimeRange[] = [
  { id: 'none', label: 'Live Locations', hours: 0 },
  { id: '1h', label: 'Last Hour', hours: 1 },
  { id: '6h', label: 'Last 6 Hours', hours: 6 },
  { id: '1d', label: 'Last Day', hours: 24 },
  { id: '7d', label: 'Last 7 Days', hours: 168 },
  { id: '30d', label: 'Last 30 Days', hours: 720 }
];

interface TimeRangeSelectorProps {
  activeRange: string;
  onRangeChange: (rangeId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  activeRange,
  onRangeChange,
  isOpen,
  onToggle
}) => {
  const activeRangeLabel = TIME_RANGES.find(r => r.id === activeRange)?.label || 'Live Locations';

  return (
    <SimpleDropdown
      isOpen={isOpen}
      onClose={onToggle}
      align="right"
      trigger={
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur-sm hover:bg-accent border-border h-8 px-3 shadow-sm"
        >
          <Clock className="h-4 w-4 mr-2" />
          <span className="text-sm">Location Interval</span>
        </Button>
      }
    >
      <div className="min-w-[200px]">
        <div className="flex flex-col gap-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.id}
              variant={activeRange === range.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onRangeChange(range.id)}
              className="justify-start text-xs h-8"
            >
              {range.id === 'none' ? (
                <Calendar className="h-3 w-3 mr-2" />
              ) : (
                <Clock className="h-3 w-3 mr-2" />
              )}
              {range.label}
            </Button>
          ))}
        </div>
      </div>
    </SimpleDropdown>
  );
};

export default TimeRangeSelector;