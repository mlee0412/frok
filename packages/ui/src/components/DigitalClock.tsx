'use client';

import { forwardRef, useState, useEffect, type ComponentPropsWithoutRef } from 'react';

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ');
}

export interface DigitalClockProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Time format: 12-hour or 24-hour
   * @default '12h'
   */
  format?: '12h' | '24h';

  /**
   * Show date (e.g., "Nov 5")
   * @default true
   */
  showDate?: boolean;

  /**
   * Show day of week (e.g., "Mon")
   * @default true
   */
  showDay?: boolean;

  /**
   * Locale for date formatting
   * @default 'en-US'
   */
  locale?: string;

  /**
   * Update interval in milliseconds
   * @default 1000 (1 second)
   */
  updateInterval?: number;
}

/**
 * DigitalClock Component
 *
 * Real-time digital clock component with customizable formatting.
 *
 * Features:
 * - 12/24 hour format support
 * - Date and day of week display
 * - Internationalization support
 * - Auto-updates every second
 * - Lightweight and accessible
 *
 * @example
 * ```tsx
 * // Basic usage
 * <DigitalClock />
 *
 * // 24-hour format without date
 * <DigitalClock format="24h" showDate={false} />
 *
 * // Korean locale
 * <DigitalClock locale="ko-KR" />
 * ```
 */
export const DigitalClock = forwardRef<HTMLDivElement, DigitalClockProps>(
  (
    {
      format = '12h',
      showDate = true,
      showDay = true,
      locale = 'en-US',
      updateInterval = 1000,
      className,
      ...props
    },
    ref
  ) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, updateInterval);

      return () => clearInterval(timer);
    }, [updateInterval]);

    // Format time based on format prop
    const timeString = currentTime.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
    });

    // Format date
    const dateString = showDate
      ? currentTime.toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
        })
      : null;

    // Format day of week
    const dayString = showDay
      ? currentTime.toLocaleDateString(locale, {
          weekday: 'short',
        })
      : null;

    // Combine parts
    const dateParts = [dayString, dateString].filter(Boolean);
    const dateDisplay = dateParts.length > 0 ? dateParts.join(', ') : null;

    return (
      <div
        ref={ref}
        className={cx('inline-flex items-center gap-2 text-foreground', className)}
        {...props}
      >
        {dateDisplay && (
          <span className="text-sm font-medium text-foreground/80">
            {dateDisplay}
          </span>
        )}
        <span className="text-sm font-semibold tabular-nums">
          {timeString}
        </span>
      </div>
    );
  }
);

DigitalClock.displayName = 'DigitalClock';
