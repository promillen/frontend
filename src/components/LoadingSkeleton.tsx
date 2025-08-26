import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'map' | 'table';
  count?: number;
}

export const DeviceCardSkeleton = () => (
  <Card className="p-4">
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-12" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  </Card>
);

export const MapSkeleton = () => (
  <div className="w-full h-full min-h-[500px] bg-muted rounded-lg flex items-center justify-center">
    <div className="text-center space-y-4">
      <Skeleton className="h-8 w-32 mx-auto" />
      <Skeleton className="h-4 w-48 mx-auto" />
      <div className="flex justify-center space-x-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

const LoadingSkeleton = ({ type = 'card', count = 3 }: LoadingSkeletonProps) => {
  if (type === 'map') {
    return <MapSkeleton />;
  }

  if (type === 'table') {
    return <TableSkeleton rows={count} />;
  }

  if (type === 'list' || type === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <DeviceCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return null;
};

export default LoadingSkeleton;