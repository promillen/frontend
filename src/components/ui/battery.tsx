import React from 'react';
import { cn } from '@/lib/utils';

interface BatteryProps {
  level: number; // 0-100
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Battery: React.FC<BatteryProps> = ({ 
  level, 
  className, 
  size = 'md' 
}) => {
  // Ensure level is between 0 and 100
  const normalizedLevel = Math.max(0, Math.min(100, level));
  
  // Get color based on battery level
  const getBatteryColor = (level: number) => {
    if (level >= 60) return 'bg-green-500';
    if (level >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const sizeClasses = {
    sm: 'w-6 h-3',
    md: 'w-8 h-4',
    lg: 'w-10 h-5'
  };

  const tipClasses = {
    sm: 'w-0.5 h-1.5',
    md: 'w-0.5 h-2',
    lg: 'w-1 h-2.5'
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="relative flex items-center">
        {/* Battery Body */}
        <div className={cn(
          "relative border-2 border-current rounded-sm overflow-hidden",
          sizeClasses[size]
        )}>
          {/* Battery Fill */}
          <div 
            className={cn(
              "absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-sm",
              getBatteryColor(normalizedLevel)
            )}
            style={{ 
              width: `${normalizedLevel}%`,
              height: '100%'
            }}
          />
        </div>
        
        {/* Battery Tip */}
        <div className={cn(
          "border-2 border-l-0 border-current rounded-r-sm",
          tipClasses[size]
        )} />
      </div>
    </div>
  );
};

export default Battery;