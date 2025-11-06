import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Width of the skeleton
   * @default '100%'
   */
  width?: string | number;

  /**
   * Height of the skeleton
   * @default '1rem'
   */
  height?: string | number;

  /**
   * Border radius
   * @default 'md'
   */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';

  /**
   * Animation variant
   * @default 'pulse'
   */
  variant?: 'pulse' | 'wave';
}

/**
 * Skeleton - Loading placeholder component
 *
 * Features:
 * - Animated pulse or wave effect
 * - Configurable size and shape
 * - Semantic color (bg-surface/50)
 * - Accessible (aria-busy)
 *
 * @example
 * ```tsx
 * <Skeleton width="100px" height="20px" />
 * <Skeleton rounded="full" width="40px" height="40px" />
 * ```
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width = '100%',
      height = '1rem',
      rounded = 'md',
      variant = 'pulse',
      className,
      ...props
    },
    ref
  ) => {
    const roundedClass = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
    }[rounded];

    const animationClass = variant === 'pulse' ? 'animate-pulse' : 'animate-wave';

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label="Loading..."
        className={`
          bg-surface/50
          ${roundedClass}
          ${animationClass}
          ${className || ''}
        `}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonText - Multi-line text skeleton
 */
export const SkeletonText = forwardRef<
  HTMLDivElement,
  { lines?: number; className?: string }
>(({ lines = 3, className }, ref) => (
  <div ref={ref} className={`space-y-2 ${className || ''}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="1rem"
        width={i === lines - 1 ? '70%' : '100%'}
      />
    ))}
  </div>
));

SkeletonText.displayName = 'SkeletonText';

/**
 * SkeletonCircle - Circular skeleton (for avatars, icons)
 */
export const SkeletonCircle = forwardRef<
  HTMLDivElement,
  { size?: number; className?: string }
>(({ size = 40, className }, ref) => (
  <Skeleton
    ref={ref}
    width={size}
    height={size}
    rounded="full"
    className={className}
  />
));

SkeletonCircle.displayName = 'SkeletonCircle';
