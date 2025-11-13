'use client';

import { motion } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

export interface SkeletonProps {
  /**
   * Width of the skeleton (CSS value)
   * @default '100%'
   */
  width?: string | number;

  /**
   * Height of the skeleton (CSS value)
   * @default '20px'
   */
  height?: string | number;

  /**
   * Border radius
   * @default 'rounded-md'
   */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Animation variant
   * @default 'pulse'
   */
  variant?: 'pulse' | 'wave' | 'none';
}

// ============================================================================
// Skeleton Component
// ============================================================================

/**
 * Skeleton - Loading placeholder with pulse animation
 *
 * Features:
 * - Customizable width, height, and border radius
 * - Multiple animation variants (pulse, wave, none)
 * - Uses design system colors (bg-surface/50)
 * - Smooth animations with framer-motion
 * - Accessible with aria-busy and aria-label
 */
export function Skeleton({
  width = '100%',
  height = '20px',
  rounded = 'md',
  className = '',
  variant = 'pulse',
}: SkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  // Simplified animation approach to avoid type complexity
  const baseClasses = variant === 'wave'
    ? 'bg-gradient-to-r from-surface/50 via-surface/70 to-surface/50 bg-[length:200%_100%]'
    : 'bg-surface/50';

  if (variant === 'none') {
    return (
      <div
        className={`${baseClasses} ${roundedClasses[rounded]} ${className}`}
        style={{ width, height }}
        aria-busy="true"
        aria-label="Loading content"
      />
    );
  }

  return (
    <motion.div
      animate={
        variant === 'pulse'
          ? { opacity: [0.5, 0.8, 0.5] }
          : { backgroundPosition: ['200% 0', '-200% 0'] }
      }
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: variant === 'pulse' ? 'easeInOut' : 'linear',
      }}
      className={`${baseClasses} ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
      aria-busy="true"
      aria-label="Loading content"
    />
  );
}

// ============================================================================
// DeviceCardSkeleton Component
// ============================================================================

/**
 * DeviceCardSkeleton - Loading placeholder for device cards
 */
export function DeviceCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
        <Skeleton width={44} height={24} rounded="full" />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="80%" height={12} />
      </div>
    </div>
  );
}

// ============================================================================
// RoomCardSkeleton Component
// ============================================================================

/**
 * RoomCardSkeleton - Loading placeholder for room cards
 */
export function RoomCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton width={40} height={40} rounded="full" />
          <div className="space-y-2 flex-1">
            <Skeleton width="50%" height={18} />
            <Skeleton width="70%" height={14} />
          </div>
        </div>
        <Skeleton width={24} height={24} rounded="sm" />
      </div>

      {/* Devices Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <DeviceCardSkeleton />
        <DeviceCardSkeleton />
        <DeviceCardSkeleton />
      </div>
    </div>
  );
}

// ============================================================================
// MessageCardSkeleton Component
// ============================================================================

/**
 * MessageCardSkeleton - Loading placeholder for chat messages
 */
export function MessageCardSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Skeleton width={32} height={32} rounded="full" />}
      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <Skeleton width={isUser ? '60%' : '80%'} height={16} />
        <Skeleton width={isUser ? '80%' : '60%'} height={16} />
        <Skeleton width={isUser ? '40%' : '50%'} height={16} />
      </div>
      {isUser && <Skeleton width={32} height={32} rounded="full" />}
    </div>
  );
}

// ============================================================================
// ThreadCardSkeleton Component
// ============================================================================

/**
 * ThreadCardSkeleton - Loading placeholder for chat thread items
 */
export function ThreadCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border bg-surface">
      <div className="flex items-start gap-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height={14} />
          <Skeleton width="90%" height={12} />
          <Skeleton width="40%" height={10} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ListSkeleton Component
// ============================================================================

/**
 * ListSkeleton - Generic list loading placeholder
 */
export function ListSkeleton({ count = 3, itemHeight = 80 }: { count?: number; itemHeight?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width="100%" height={itemHeight} rounded="lg" />
      ))}
    </div>
  );
}
