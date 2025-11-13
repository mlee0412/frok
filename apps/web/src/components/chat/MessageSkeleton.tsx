'use client';

import { motion } from 'framer-motion';

// ============================================================================
// MessageSkeleton Component
// ============================================================================

/**
 * MessageSkeleton - Loading placeholder for messages
 *
 * Features:
 * - Shimmer animation effect
 * - Multiple line skeletons (3/4, full, 2/3 width)
 * - Fade out when real content appears
 * - Role-based styling (user/assistant)
 */

export interface MessageSkeletonProps {
  /**
   * Message role for styling
   */
  role?: 'user' | 'assistant';

  /**
   * Compact mode (smaller padding)
   */
  isCompact?: boolean;
}

export function MessageSkeleton({ role = 'assistant', isCompact = false }: MessageSkeletonProps) {
  const isUser = role === 'user';
  const bubbleWidthClass = isCompact ? 'max-w-full sm:max-w-2xl' : 'max-w-full sm:max-w-3xl';
  const bubblePaddingClass = isCompact ? 'px-4 py-3' : 'px-5 py-4';

  // Role-based styling
  const roleStyles = isUser
    ? 'bg-primary/10 border-primary/30'
    : 'bg-surface border-border';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`${bubbleWidthClass} ${bubblePaddingClass} rounded-2xl border ${roleStyles} backdrop-blur-sm space-y-3`}
      >
        {/* Header Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-foreground/10 animate-pulse" />
          <div className="h-4 w-20 rounded bg-foreground/10 animate-pulse" />
        </div>

        {/* Content Skeleton - 3 lines with varying widths */}
        <div className="space-y-2">
          {/* Line 1: 75% width */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="h-4 w-3/4 rounded bg-foreground/20"
          />

          {/* Line 2: Full width */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.2,
            }}
            className="h-4 w-full rounded bg-foreground/20"
          />

          {/* Line 3: 66% width */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
            className="h-4 w-2/3 rounded bg-foreground/20"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MessageListSkeleton - Multiple message skeletons
// ============================================================================

export interface MessageListSkeletonProps {
  /**
   * Number of skeleton messages to show
   */
  count?: number;

  /**
   * Compact mode
   */
  isCompact?: boolean;
}

export function MessageListSkeleton({ count = 3, isCompact = false }: MessageListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            delay: index * 0.1, // Stagger effect
          }}
        >
          <MessageSkeleton role={index % 2 === 0 ? 'assistant' : 'user'} isCompact={isCompact} />
        </motion.div>
      ))}
    </div>
  );
}
