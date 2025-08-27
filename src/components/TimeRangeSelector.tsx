import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, X } from 'lucide-react';

export interface TimeRange {
  id: string;
  label: string;
  hours: number;
}

export const TIME_RANGES: TimeRange[] = [
  { id: 'none', label: 'Current Position', hours: 0 },
  { id: '1h', label: 'Last Hour', hours: 1 },
  { id: '6h', label: 'Last 6 Hours', hours: 6 },
  { id: '1d', label: 'Last Day', hours: 24 },
  { id: '7d', label: 'Last 7 Days', hours: 168 },
  { id: '30d', label: 'Last 30 Days', hours: 720 }
];

interface TimeRangeSelectorProps {
  activeRange: string;
  onRangeChange: (rangeId: string) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  activeRange,
  onRangeChange
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const activeRangeLabel = TIME_RANGES.find(r => r.id === activeRange)?.label || 'Current Position';

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="secondary"
        size="sm"
        className="absolute top-28 right-4 z-[1000] bg-card/95 backdrop-blur-sm hover:bg-card"
      >
        <Clock className="h-4 w-4 mr-2" />
        {activeRangeLabel}
      </Button>
    );
  }

  return (
    <Card className="absolute top-28 right-4 z-[1000] bg-card/95 backdrop-blur-sm">
      <CardContent className="p-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="text-xs font-medium">Movement Tracking</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
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
      </CardContent>
    </Card>
  );
};

export default TimeRangeSelector;