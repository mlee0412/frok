import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Card } from '@frok/ui';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * QuickActionCardSkeleton - Loading placeholder for QuickActionCard
 */
export const QuickActionCardSkeleton = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className }, ref) => {
    return (
      <div ref={ref}>
        <Card className={className}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton width="150px" height="1.5rem" />
            <Skeleton width="80%" height="0.875rem" />
          </div>

          {/* Actions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height="40px" rounded="lg" />
            ))}
          </div>

          {/* Scenes/Scripts sections */}
          <div className="pt-3 border-t border-border space-y-3">
            <Skeleton width="100px" height="1rem" />
            <div className="flex gap-2 overflow-x-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width="120px" height="36px" rounded="lg" />
              ))}
            </div>
          </div>
        </div>
      </Card>
      </div>
    );
  }
);

QuickActionCardSkeleton.displayName = 'QuickActionCardSkeleton';
