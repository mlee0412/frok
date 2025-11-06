import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Card } from '@frok/ui';
import { Skeleton } from '@/components/ui/Skeleton';

export interface RoomCardSkeletonProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Number of skeleton cards to render
   * @default 1
   */
  count?: number;

  /**
   * Number of device skeletons to show inside
   * @default 3
   */
  deviceCount?: number;
}

/**
 * RoomCardSkeleton - Loading placeholder for RoomCard
 */
export const RoomCardSkeleton = forwardRef<HTMLDivElement, RoomCardSkeletonProps>(
  ({ count = 1, deviceCount = 3, className }, ref) => {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} ref={index === 0 ? ref : undefined}>
            <Card className={className}>
            {/* Header */}
            <div className="p-4 bg-surface/50 border-b border-border rounded-t-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton width="24px" height="24px" />
                  <div className="space-y-2">
                    <Skeleton width="120px" height="1.25rem" />
                    <Skeleton width="180px" height="0.875rem" />
                  </div>
                </div>
                <Skeleton width="24px" height="24px" />
              </div>
            </div>

            {/* Content (devices grid) */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: deviceCount }).map((_, i) => (
                  <div key={i} className="p-3 border border-border rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton width="40px" height="40px" rounded="lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton width="70%" height="1rem" />
                        <Skeleton width="50%" height="0.875rem" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          </div>
        ))}
      </>
    );
  }
);

RoomCardSkeleton.displayName = 'RoomCardSkeleton';
