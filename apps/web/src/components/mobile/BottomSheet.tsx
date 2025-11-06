'use client';

import { useEffect, useRef, type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@frok/ui';

export interface BottomSheetProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * Whether the bottom sheet is open
   */
  isOpen: boolean;

  /**
   * Callback when the sheet is closed
   */
  onClose: () => void;

  /**
   * Sheet content
   */
  children: ReactNode;

  /**
   * Sheet title (displayed in header)
   */
  title?: string;

  /**
   * Sheet height mode
   * - 'half': Sheet takes up 50% of viewport
   * - 'full': Sheet takes up 90% of viewport
   * - 'auto': Sheet height fits content
   * @default 'half'
   */
  size?: 'half' | 'full' | 'auto';

  /**
   * Whether to show the drag handle at the top
   * @default true
   */
  showDragHandle?: boolean;

  /**
   * Whether to show the close button in header
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Custom header content (replaces title)
   */
  header?: ReactNode;

  /**
   * Dismiss threshold (0-1). Sheet will close if dragged down more than this percentage
   * @default 0.3
   */
  dismissThreshold?: number;
}

/**
 * BottomSheet - Mobile-optimized slide-up sheet with swipe-to-dismiss
 *
 * Features:
 * - Smooth slide-up animation with framer-motion
 * - Swipe-to-dismiss gesture (drag down to close)
 * - Backdrop overlay with tap-to-close
 * - Configurable sizes (half, full, auto)
 * - Drag handle for affordance
 * - Locks body scroll when open
 * - Portal rendering for proper z-index stacking
 *
 * @example
 * ```tsx
 * <BottomSheet
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Chat Threads"
 *   size="half"
 * >
 *   <ChatThreadList />
 * </BottomSheet>
 * ```
 */
export const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(
  (
    {
      isOpen,
      onClose,
      children,
      title,
      size = 'half',
      showDragHandle = true,
      showCloseButton = true,
      header,
      dismissThreshold = 0.3,
      className,
      ...props
    },
    ref
  ) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const y = useMotionValue(0);

    // Calculate sheet height based on size
    const getSheetHeight = () => {
      switch (size) {
        case 'half':
          return '50vh';
        case 'full':
          return '90vh';
        case 'auto':
          return 'auto';
        default:
          return '50vh';
      }
    };

    // Transform y position to opacity for backdrop
    const backdropOpacity = useTransform(y, [0, 300], [0.5, 0]);

    // Handle drag end
    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = window.innerHeight * dismissThreshold;

      // Close if dragged down past threshold
      if (info.offset.y > threshold) {
        onClose();
      }
    };

    // Lock body scroll when sheet is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
          style={{ opacity: backdropOpacity }}
        />

        {/* Sheet */}
        <motion.div
          {...({} as any)}
          ref={sheetRef}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{
            type: 'spring',
            damping: 30,
            stiffness: 300,
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd as any}
          style={{ y } as any}
          className={`
            fixed bottom-0 left-0 right-0 z-[101]
            bg-surface
            rounded-t-3xl
            shadow-2xl
            border-t border-border
            md:hidden
            pb-safe-bottom
            ${className || ''}
          `}
          {...props}
        >
          {/* Drag handle */}
          {showDragHandle && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-foreground/20 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="sticky top-0 bg-surface z-10 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              {header || (
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              )}
              {showCloseButton && (
                <Button
                  variant="ghost"
                  onClick={onClose}
                  aria-label="Close"
                  className="h-8 w-8 p-0"
                >
                  <X size={20} />
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div
            ref={ref}
            className="overflow-y-auto overscroll-contain"
            style={{
              maxHeight: getSheetHeight(),
            }}
          >
            {children}
          </div>
        </motion.div>
      </>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';
