'use client';

import { useState, type ComponentPropsWithoutRef, forwardRef } from 'react';
import type { Device } from '@frok/clients';
import { Card, Button } from '@frok/ui';
import {
  Lightbulb,
  Power,
  ThermometerIcon,
  Blinds,
  Play,
  Pause,
  ChevronRight
} from 'lucide-react';
import DeviceControls from './DeviceControls';

export interface DeviceCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * Device data
   */
  device: Device;

  /**
   * Whether to show advanced controls by default
   * @default false
   */
  showAdvancedControls?: boolean;

  /**
   * Callback when card is long-pressed (for multi-select)
   */
  onLongPress?: (device: Device) => void;

  /**
   * Whether the card is selected (for bulk actions)
   */
  isSelected?: boolean;
}

/**
 * Get icon for device type
 */
const getDeviceIcon = (device: Device) => {
  switch (device.type) {
    case 'light':
      return Lightbulb;
    case 'switch':
      return Power;
    case 'media_player':
      return device.state === 'playing' ? Play : Pause;
    case 'climate':
      return ThermometerIcon;
    case 'cover':
      return Blinds;
    default:
      return Power;
  }
};

/**
 * Get state color for device
 */
const getStateColor = (device: Device): string => {
  if (device.online === false) return 'text-danger';

  switch (device.state) {
    case 'on':
    case 'playing':
    case 'heating':
    case 'cooling':
      return 'text-primary';
    case 'off':
    case 'paused':
    case 'stopped':
    case 'idle':
      return 'text-foreground/40';
    case 'unavailable':
      return 'text-danger';
    default:
      return 'text-foreground/60';
  }
};

/**
 * DeviceCard - Touch-optimized card for individual device control
 *
 * Features:
 * - Large touch targets (min 48px)
 * - Visual feedback on press
 * - Quick toggle for lights/switches
 * - Expandable advanced controls
 * - Long-press for multi-select mode
 * - Status indicator (online/offline)
 *
 * @example
 * ```tsx
 * <DeviceCard
 *   device={lightDevice}
 *   onStateChange={handleChange}
 *   showAdvancedControls={false}
 * />
 * ```
 */
export const DeviceCard = forwardRef<HTMLDivElement, DeviceCardProps>(
  (
    {
      device,
      showAdvancedControls = false,
      onLongPress,
      isSelected = false,
      className,
    },
    ref
  ) => {
    const [showControls, setShowControls] = useState(showAdvancedControls);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

    const Icon = getDeviceIcon(device);
    const stateColor = getStateColor(device);

    const handleTouchStart = () => {
      if (onLongPress) {
        const timer = setTimeout(() => {
          onLongPress(device);
          // Haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, 500);
        setLongPressTimer(timer);
      }
    };

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    return (
      <div
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        role="article"
        aria-label={`${device.name} ${device.type} device`}
        aria-selected={isSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onLongPress) {
            e.preventDefault();
            if (e.repeat) {
              // Long press simulation for keyboard
              onLongPress(device);
            } else {
              setShowControls(!showControls);
            }
          }
        }}
      >
      <Card
        className={`
          transition-all duration-200
          hover:shadow-lg hover:border-primary/30
          focus-within:ring-2 focus-within:ring-primary/50
          ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
          ${className || ''}
        `}
      >
        <div className="p-4 space-y-4">
          {/* @ts-expect-error - Complex nested component type inference issue */}
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Icon with status indicator */}
              <div className="relative flex-shrink-0">
                <div className={`p-2 rounded-lg bg-surface ${stateColor}`}>
                  <Icon size={24} />
                </div>
                {/* Online status indicator */}
                <span
                  className={`
                    absolute -bottom-1 -right-1
                    h-3 w-3 rounded-full border-2 border-surface
                    ${device.online === false ? 'bg-danger' : 'bg-success'}
                  `}
                  aria-label={device.online === false ? 'Offline' : 'Online'}
                />
              </div>

              {/* Device info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">
                  {device.name}
                </h3>
                <p className="text-sm text-foreground/60 capitalize">
                  {device.state || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Type badge */}
            <span className="
              text-[10px] uppercase tracking-wide
              px-2 py-1 rounded-full
              border border-border bg-surface/50
              text-foreground/60
              whitespace-nowrap
            ">
              {device.type || 'unknown'}
            </span>
          </div>

          {/* Quick stats (if available) */}
          {(device.attrs?.['brightness'] || device.attrs?.['temperature'] || device.attrs?.['volume_level']) && (
            <div className="flex items-center gap-4 text-xs text-foreground/60">
              {device.attrs['brightness'] !== undefined && device.attrs['brightness'] !== null && (
                <span>💡 {Math.round((Number(device.attrs['brightness']) / 255) * 100)}%</span>
              )}
              {device.attrs['temperature'] !== undefined && device.attrs['temperature'] !== null && (
                <span>🌡️ {String(device.attrs['temperature'])}°</span>
              )}
              {device.attrs['volume_level'] !== undefined && device.attrs['volume_level'] !== null && (
                <span>🔊 {Math.round(Number(device.attrs['volume_level']) * 100)}%</span>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="space-y-3">
            {/* Toggle controls button */}
            {(device.type === 'light' || device.type === 'media_player' || device.type === 'climate') && (
              <Button
                variant="ghost"
                onClick={() => setShowControls(!showControls)}
                className="w-full h-10 justify-between"
                aria-expanded={showControls}
                aria-controls={`device-controls-${device.id}`}
                aria-label={showControls ? `Hide controls for ${device.name}` : `Show controls for ${device.name}`}
              >
                <span className="text-sm">
                  {showControls ? 'Hide Controls' : 'Show Controls'}
                </span>
                <ChevronRight
                  size={16}
                  className={`transition-transform ${showControls ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                />
              </Button>
            )}

            {/* Advanced controls */}
            {showControls && (
              <div
                id={`device-controls-${device.id}`}
                className="pt-2 border-t border-border"
                role="region"
                aria-label={`Advanced controls for ${device.name}`}
              >
                <DeviceControls device={device} />
              </div>
            )}
          </div>
        </div>
      </Card>
      </div>
    ) as React.ReactElement;
  }
);

DeviceCard.displayName = 'DeviceCard';
