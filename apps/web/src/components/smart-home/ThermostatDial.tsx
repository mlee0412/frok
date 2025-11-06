'use client';

import { useState, useRef, useEffect, type ComponentPropsWithoutRef, forwardRef } from 'react';

export interface ThermostatDialProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'onChange'> {
  /**
   * Current temperature value
   */
  value: number;

  /**
   * Minimum temperature
   * @default 10
   */
  min?: number;

  /**
   * Maximum temperature
   * @default 35
   */
  max?: number;

  /**
   * Temperature step size
   * @default 0.5
   */
  step?: number;

  /**
   * Dial size in pixels
   * @default 200
   */
  size?: number;

  /**
   * Temperature unit
   * @default '°C'
   */
  unit?: string;

  /**
   * Callback when value changes
   */
  onChange?: (value: number) => void;

  /**
   * Whether the dial is disabled
   * @default false
   */
  disabled?: boolean;
}

/**
 * ThermostatDial - Circular touch-optimized temperature control
 *
 * Features:
 * - Circular drag interaction
 * - Visual arc showing temperature range
 * - Large touch targets (48px+ handle)
 * - Precise touch/mouse tracking
 * - Keyboard accessible (arrow keys)
 * - Responsive design
 *
 * @example
 * ```tsx
 * <ThermostatDial
 *   value={22}
 *   min={16}
 *   max={30}
 *   onChange={(temp) => setTemperature('climate.living_room', temp)}
 * />
 * ```
 */
export const ThermostatDial = forwardRef<HTMLDivElement, ThermostatDialProps>(
  (
    {
      value,
      min = 10,
      max = 35,
      step = 0.5,
      size = 200,
      unit = '°C',
      onChange,
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const dialRef = useRef<SVGSVGElement>(null);

    // Normalize value to 0-1 range
    const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));

    // Calculate angle (300° arc, starting at 210° and ending at 510°)
    const startAngle = 210;
    const endAngle = 510;
    const angleRange = endAngle - startAngle;
    const currentAngle = startAngle + normalizedValue * angleRange;

    // Convert angle to radians for calculations
    const toRadians = (deg: number) => (deg * Math.PI) / 180;

    // Calculate handle position
    const radius = (size / 2) - 20; // Account for padding
    const centerX = size / 2;
    const centerY = size / 2;
    const handleX = centerX + radius * Math.cos(toRadians(currentAngle));
    const handleY = centerY + radius * Math.sin(toRadians(currentAngle));

    // Generate arc path for background track
    const createArcPath = (start: number, end: number, r: number) => {
      const startRad = toRadians(start);
      const endRad = toRadians(end);
      const x1 = centerX + r * Math.cos(startRad);
      const y1 = centerY + r * Math.sin(startRad);
      const x2 = centerX + r * Math.cos(endRad);
      const y2 = centerY + r * Math.sin(endRad);
      const largeArc = end - start > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    const backgroundArc = createArcPath(startAngle, endAngle, radius);
    const valueArc = createArcPath(startAngle, currentAngle, radius);

    // Handle pointer interaction with improved angle calculation
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (disabled || !onChange) return;

      const svg = dialRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left - centerX;
      const y = clientY - rect.top - centerY;

      // Calculate angle from center (in radians, then convert to degrees)
      let angle = Math.atan2(y, x) * (180 / Math.PI);

      // Normalize angle to 0-360 range
      if (angle < 0) angle += 360;

      // Our dial uses 210° to 510° (wraps around 0°)
      // Convert to our coordinate system:
      // - Bottom left (210°) should map to min value
      // - Bottom right (510° = 150°) should map to max value
      let mappedAngle: number;

      if (angle >= 210 && angle <= 360) {
        // Left side of dial (210° to 360°)
        mappedAngle = angle;
      } else if (angle >= 0 && angle <= 150) {
        // Right side of dial (0° to 150° = 360° to 510°)
        mappedAngle = angle + 360;
      } else {
        // Outside valid range (150° to 210°) - snap to nearest edge
        const distToStart = Math.min(Math.abs(angle - 210), Math.abs(angle - (210 - 360)));
        const distToEnd = Math.abs(angle - 150);
        mappedAngle = distToStart < distToEnd ? 210 : 510;
      }

      // Clamp to valid range
      mappedAngle = Math.max(startAngle, Math.min(endAngle, mappedAngle));

      // Convert angle to value (0 to 1)
      const normalizedAngle = (mappedAngle - startAngle) / angleRange;
      const rawValue = min + normalizedAngle * (max - min);

      // Round to step and clamp
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      // Only call onChange if value actually changed
      if (Math.abs(clampedValue - value) >= step / 2) {
        onChange(clampedValue);
      }
    };

    // Mouse events with improved event handling
    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      handlePointerMove(e.clientX, e.clientY);
    };

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && !disabled) {
          e.preventDefault();
          handlePointerMove(e.clientX, e.clientY);
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        if (isDragging) {
          e.preventDefault();
          setIsDragging(false);
        }
      };

      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, disabled]);

    // Touch events with improved event handling
    const handleTouchStart = (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const touch = e.touches[0];
      if (touch) {
        handlePointerMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging || disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      if (touch) {
        handlePointerMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    // Keyboard accessibility
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      let newValue = value;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
          e.preventDefault();
          newValue = Math.min(max, value + step);
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          e.preventDefault();
          newValue = Math.max(min, value - step);
          break;
        case 'Home':
          e.preventDefault();
          newValue = min;
          break;
        case 'End':
          e.preventDefault();
          newValue = max;
          break;
        default:
          return;
      }

      if (newValue !== value) {
        onChange?.(newValue);
      }
    };

    return (
      <div
        ref={ref}
        className={`relative inline-flex items-center justify-center ${className || ''}`}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          ref={dialRef}
          width={size}
          height={size}
          className={`${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label="Temperature control"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value}${unit}`}
          style={{ touchAction: 'none' }}
        >
          {/* Background arc */}
          <path
            d={backgroundArc}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Value arc */}
          <path
            d={valueArc}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="12"
            strokeLinecap="round"
            className="transition-all duration-150"
          />

          {/* Draggable handle */}
          <g
            className={`${isDragging ? 'scale-110' : ''} transition-transform duration-150`}
            style={{ transformOrigin: `${handleX}px ${handleY}px` }}
          >
            {/* Outer glow ring */}
            <circle
              cx={handleX}
              cy={handleY}
              r="24"
              fill="var(--color-primary)"
              opacity="0.2"
            />
            {/* Main handle */}
            <circle
              cx={handleX}
              cy={handleY}
              r="18"
              fill="var(--color-background)"
              stroke="var(--color-primary)"
              strokeWidth="3"
              className="shadow-lg"
            />
            {/* Center dot */}
            <circle
              cx={handleX}
              cy={handleY}
              r="6"
              fill="var(--color-primary)"
            />
          </g>
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-5xl font-bold text-foreground">
            {value.toFixed(1)}
          </div>
          <div className="text-lg text-foreground/60 mt-1">
            {unit}
          </div>
          <div className="text-xs text-foreground/40 mt-2">
            {min}° – {max}°
          </div>
        </div>
      </div>
    );
  }
);

ThermostatDial.displayName = 'ThermostatDial';
