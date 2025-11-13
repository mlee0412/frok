'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';

// ============================================================================
// Types
// ============================================================================

export interface MobileNavHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

// ============================================================================
// MobileNavHeader Component
// ============================================================================

/**
 * MobileNavHeader - Mobile-only header with back navigation
 *
 * Features:
 * - Fixed top positioning (mobile only, md:hidden)
 * - Back button with haptic feedback
 * - Custom right actions support
 * - Safe area padding for iOS notch
 * - Smooth entrance animation
 */
export function MobileNavHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
  className = '',
}: MobileNavHeaderProps) {
  const router = useRouter();
  const { vibrate } = useHaptic();

  function handleBack() {
    vibrate('light');
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className={`md:hidden fixed top-0 left-0 right-0 z-40 border-b border-border bg-surface/95 backdrop-blur-lg ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Back Button */}
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Title */}
        <h1 className="flex-1 truncate text-lg font-semibold text-foreground">
          {title}
        </h1>

        {/* Right Action */}
        {rightAction && (
          <div className="flex items-center gap-2">
            {rightAction}
          </div>
        )}
      </div>
    </motion.header>
  );
}
