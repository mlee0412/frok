'use client';

import { motion, type PanInfo } from 'framer-motion';
import { useState } from 'react';
import { useHaptic } from '@/hooks/useHaptic';

// ============================================================================
// Types
// ============================================================================

export interface FloatingActionButtonProps {
  icon?: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  draggable?: boolean; // Allow repositioning
}

// ============================================================================
// FloatingActionButton Component
// ============================================================================

/**
 * FloatingActionButton (FAB) - Floating action button for quick actions
 *
 * Features:
 * - Fixed positioning (bottom-right on mobile)
 * - Draggable to reposition (optional)
 * - Haptic feedback on click
 * - Smooth animations with framer-motion
 * - Safe area padding
 * - Accessibility support (ARIA)
 */
export function FloatingActionButton({
  icon,
  onClick,
  ariaLabel,
  className = '',
  draggable = false,
}: FloatingActionButtonProps) {
  const { vibrate } = useHaptic();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  function handleClick() {
    vibrate('medium');
    onClick();
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    });
  }

  const defaultIcon = (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <motion.button
      type="button"
      drag={draggable}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={draggable ? handleDragEnd : undefined}
      animate={{
        x: position.x,
        y: position.y,
        boxShadow: [
          '0 10px 15px -3px rgb(34 211 238 / 0.3), 0 4px 6px -4px rgb(34 211 238 / 0.3)',
          '0 20px 25px -5px rgb(34 211 238 / 0.5), 0 8px 10px -6px rgb(34 211 238 / 0.5)',
          '0 10px 15px -3px rgb(34 211 238 / 0.3), 0 4px 6px -4px rgb(34 211 238 / 0.3)',
        ],
      }}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={handleClick}
      className={`md:hidden fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white ${className}`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={ariaLabel}
    >
      {icon || defaultIcon}
    </motion.button>
  );
}
