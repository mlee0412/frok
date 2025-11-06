import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Card } from '@frok/ui';
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton';

export interface DeviceCardSkeletonProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Number of skeleton cards to render
   * @default 1
   */
  count?: number;
}

/**
 * DeviceCardSkeleton - Loading placeholder for DeviceCard
 *
 * Mimics the structure of DeviceCard for smooth loading transitions.
 */
export const DeviceCardSkeleton = forwardRef<HTMLDivElement, DeviceCardSkeletonProps>(
  ({ count = 1, className }, ref) => {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} ref={index === 0 ? ref : undefined}>
            <Card className={className}>
              <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Icon with status indicator */}
                    <SkeletonCircle size={40} />

                    {/* Name and state */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton width="60%" height="1.25rem" />
                      <Skeleton width="40%" height="0.875rem" />
                    </div>
                  </div>

                  {/* Actions skeleton */}
                  <Skeleton width="24px" height="24px" rounded="md" />
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Skeleton width="60px" height="1rem" rounded="full" />
                  <Skeleton width="80px" height="1rem" rounded="full" />
                </div>
              </div>
            </Card>
          </div>
        ))}
      </>
    );
  }
);

DeviceCardSkeleton.displayName = 'DeviceCardSkeleton';
