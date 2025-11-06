'use client';

/**
 * RadialMenu Component
 *
 * Circular menu that appears on long-press, providing quick access to actions.
 *
 * Features:
 * - Long-press activation (800ms threshold)
 * - Radial layout with 6-8 slots
 * - Viewport edge detection
 * - Haptic feedback
 * - Staggered item animations
 * - Keyboard accessible
 *
 * Layout:
 *        [Item 1]
 *   [2]     ⊙     [8]
 * [3]             [7]
 *   [4]     ●     [6]
 *        [Item 5]
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { RadialMenuItem } from './RadialMenuItem';
import { useLongPress } from '@/hooks/useLongPress';

/**
 * Action configuration
 */
export interface RadialMenuAction {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Icon element (SVG or React component)
   */
  icon: React.ReactNode;

  /**
   * Action label
   */
  label: string;

  /**
   * Click handler (can be async)
   */
  onClick: () => void | Promise<void>;

  /**
   * Whether action is disabled
   */
  disabled?: boolean;
}

export interface RadialMenuProps {
  /**
   * Array of actions to display (6-8 recommended)
   */
  actions: RadialMenuAction[];

  /**
   * Long-press threshold in milliseconds
   * @default 800
   */
  threshold?: number;

  /**
   * Menu radius in pixels
   * @default 120
   */
  radius?: number;

  /**
   * Individual item size in pixels
   * @default 56
   */
  itemSize?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Callback when menu opens
   */
  onOpen?: () => void;

  /**
   * Callback when menu closes
   */
  onClose?: () => void;
}

/**
 * Calculate position for a slot in the radial menu
 */
function getSlotPosition(
  index: number,
  total: number,
  radius: number
): { x: number; y: number } {
  // Start at top (12 o'clock) and go clockwise
  const angleOffset = -Math.PI / 2; // Start at top
  const angle = (index / total) * Math.PI * 2 + angleOffset;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

/**
 * Adjust menu position to stay within viewport
 */
function adjustMenuPosition(
  x: number,
  y: number,
  radius: number
): { x: number; y: number } {
  const padding = 20; // Min distance from edge

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Adjust X
  const minX = radius + padding;
  const maxX = viewport.width - radius - padding;
  const adjustedX = Math.max(minX, Math.min(maxX, x));

  // Adjust Y
  const minY = radius + padding;
  const maxY = viewport.height - radius - padding;
  const adjustedY = Math.max(minY, Math.min(maxY, y));

  return { x: adjustedX, y: adjustedY };
}

export function RadialMenu({
  actions,
  threshold = 800,
  radius = 120,
  itemSize = 56,
  className,
  onOpen,
  onClose,
}: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Open menu at specified position
   */
  const openMenu = useCallback(
    (x: number, y: number) => {
      const adjusted = adjustMenuPosition(x, y, radius);
      setMenuPosition(adjusted);
      setIsOpen(true);
      onOpen?.();
    },
    [radius, onOpen]
  );

  /**
   * Close menu
   */
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSelectedItemId(null);
    onClose?.();
  }, [onClose]);

  /**
   * Handle long-press gesture
   */
  const { handlers } = useLongPress({
    onLongPress: (_event, position) => {
      openMenu(position.x, position.y);
    },
    threshold,
    hapticFeedback: true,
  });

  /**
   * Handle click outside to close
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    // Add listeners with a slight delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  /**
   * Handle escape key to close
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeMenu]);

  /**
   * Handle action click
   */
  const handleActionClick = useCallback(
    async (action: RadialMenuAction) => {
      if (action.disabled) return;

      try {
        await action.onClick();
      } catch (error: unknown) {
        console.error('[RadialMenu] Action error:', error);
      } finally {
        closeMenu();
      }
    },
    [closeMenu]
  );

  return (
    <>
      {/* Long-press trigger area (full screen) */}
      <div
        {...handlers}
        className={`fixed inset-0 touch-none pointer-events-auto ${className || ''}`}
        style={{ zIndex: isOpen ? -1 : 0 }}
      />

      {/* Radial menu (appears on long-press) */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            style={{
              zIndex: 50,
              animation: 'radial-menu-backdrop 0.2s ease-out',
            }}
            onClick={closeMenu}
          />

          {/* Menu container */}
          <div
            ref={menuRef}
            role="menu"
            aria-label="Quick actions menu"
            className="fixed"
            style={{
              zIndex: 51,
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              animation: 'radial-menu-open 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform, opacity',
            }}
          >
            {/* Center indicator */}
            <div
              className="absolute w-3 h-3 bg-primary rounded-full"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />

            {/* Menu items */}
            {actions.map((action, index) => {
              const position = getSlotPosition(index, actions.length, radius);
              const animationDelay = index * 50; // Stagger by 50ms

              return (
                <RadialMenuItem
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  onClick={() => handleActionClick(action)}
                  position={position}
                  isSelected={selectedItemId === action.id}
                  size={itemSize}
                  animationDelay={animationDelay}
                  disabled={action.disabled}
                  onMouseEnter={() => setSelectedItemId(action.id)}
                  onMouseLeave={() => setSelectedItemId(null)}
                  onFocus={() => setSelectedItemId(action.id)}
                  onBlur={() => setSelectedItemId(null)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes radial-menu-open {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes radial-menu-backdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes radial-item-appear {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1);
          }
        }
      `}</style>
    </>
  );
}
