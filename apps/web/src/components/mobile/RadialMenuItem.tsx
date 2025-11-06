'use client';

/**
 * RadialMenuItem Component
 *
 * Individual item/slot in the radial menu.
 * Displays an icon with label and handles click interactions.
 *
 * Features:
 * - Positioned absolutely based on slot angle
 * - Hover/focus effects with scale animation
 * - Disabled state support
 * - Accessible with ARIA attributes
 * - Hardware-accelerated animations
 */

import { type ComponentPropsWithoutRef } from 'react';

export interface RadialMenuItemProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> {
  /**
   * Icon element to display
   */
  icon: React.ReactNode;

  /**
   * Label text (shown below icon)
   */
  label: string;

  /**
   * Click handler
   */
  onClick: () => void | Promise<void>;

  /**
   * Position relative to menu center (in pixels)
   */
  position: { x: number; y: number };

  /**
   * Whether this item is currently selected/hovered
   */
  isSelected?: boolean;

  /**
   * Item size in pixels
   * @default 56
   */
  size?: number;

  /**
   * Animation delay for staggered appearance
   * @default 0
   */
  animationDelay?: number;
}

export function RadialMenuItem({
  icon,
  label,
  onClick,
  position,
  isSelected = false,
  size = 56,
  animationDelay = 0,
  disabled = false,
  className,
  ...props
}: RadialMenuItemProps) {
  const handleClick = async () => {
    if (!disabled) {
      await onClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        absolute flex flex-col items-center justify-center gap-1
        rounded-full bg-surface/90 border border-border/50
        text-foreground/80 transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        ${
          isSelected
            ? 'bg-primary/90 text-white scale-110 shadow-lg'
            : 'hover:bg-surface hover:scale-105 active:scale-95'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className || ''}
      `}
      style={{
        left: '50%',
        top: '50%',
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        opacity: 1,
        willChange: 'transform, opacity',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        transitionDelay: `${animationDelay}ms`,
      }}
      aria-label={label}
      role="menuitem"
      {...props}
    >
      {/* Icon */}
      <div className="w-6 h-6 flex items-center justify-center">{icon}</div>

      {/* Label */}
      <span className="text-xs font-medium leading-none whitespace-nowrap">{label}</span>
    </button>
  );
}
