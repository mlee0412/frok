'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@frok/ui';

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon: LucideIcon;

  /**
   * Primary message title
   */
  title: string;

  /**
   * Secondary description message
   */
  description?: string;

  /**
   * Optional action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// EmptyState Component
// ============================================================================

/**
 * EmptyState - Display for no data scenarios
 *
 * Features:
 * - Large icon with subtle animation
 * - Title and description text
 * - Optional call-to-action button
 * - Centered layout with good spacing
 * - Smooth entrance animation
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.1,
        }}
        className="mb-4"
      >
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-surface/50 border border-border">
          <Icon size={40} className="text-foreground/40" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-foreground/60 max-w-md mb-6">{description}</p>
      )}

      {/* Action Button */}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
