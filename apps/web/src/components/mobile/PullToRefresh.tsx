'use client';

import { useState, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

// ============================================================================
// Types
// ============================================================================

export interface PullToRefreshProps {
  /**
   * Children to render inside scrollable area
   */
  children: ReactNode;

  /**
   * Callback when refresh is triggered
   */
  onRefresh: () => Promise<void>;

  /**
   * Additional CSS classes for container
   */
  className?: string;

  /**
   * Pull distance threshold to trigger refresh (px)
   * @default 80
   */
  threshold?: number;

  /**
   * Whether refresh is currently active
   */
  isRefreshing?: boolean;
}

// ============================================================================
// PullToRefresh Component
// ============================================================================

/**
 * PullToRefresh - Pull-down gesture to refresh content (mobile)
 *
 * Features:
 * - Touch-based pull-to-refresh gesture
 * - Visual feedback with rotating icon
 * - Haptic feedback on trigger
 * - Configurable pull threshold
 * - Smooth spring animations
 * - Mobile-only (touch events)
 */
export function PullToRefresh({
  children,
  onRefresh,
  className = '',
  threshold = 80,
  isRefreshing = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { vibrate } = useHaptic();

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      const touch = e.touches[0];
      if (touch) {
        startY.current = touch.clientY;
        setIsPulling(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const touch = e.touches[0];
    if (!touch) return;

    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - startY.current);

    // Dampen the pull distance for more natural feel
    const dampened = Math.min(distance * 0.5, threshold * 1.5);
    setPullDistance(dampened);

    // Haptic feedback when reaching threshold
    if (dampened >= threshold && pullDistance < threshold) {
      vibrate('medium');
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      vibrate('success');
      await onRefresh();
    }

    setPullDistance(0);
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const iconRotation = progress * 360;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <motion.div
        animate={{
          height: isPulling || isRefreshing ? pullDistance : 0,
          opacity: isPulling || isRefreshing ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center"
        style={{ zIndex: 1 }}
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : iconRotation }}
          transition={{
            duration: isRefreshing ? 1 : 0,
            repeat: isRefreshing ? Infinity : 0,
            ease: 'linear',
          }}
          className={`flex items-center justify-center ${
            progress >= 1 ? 'text-primary' : 'text-foreground/40'
          }`}
        >
          <RefreshCw size={24} strokeWidth={2} />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={{ y: isPulling || isRefreshing ? pullDistance : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
