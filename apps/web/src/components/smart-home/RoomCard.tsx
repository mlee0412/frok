'use client';

import { useState, useMemo, type ComponentPropsWithoutRef, forwardRef } from 'react';
import type { Device } from '@frok/clients';
import { Card, Button } from '@frok/ui';
import {
  Home,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Power
} from 'lucide-react';
import { DeviceCard } from './DeviceCard';

export interface RoomCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * Room/area name
   */
  room: string;

  /**
   * Devices in this room
   */
  devices: Device[];

  /**
   * Whether the room section is initially expanded
   * @default false
   */
  initiallyExpanded?: boolean;

  /**
   * Callback to turn all lights on in room
   */
  onAllLightsOn?: () => void;

  /**
   * Callback to turn all lights off in room
   */
  onAllLightsOff?: () => void;
}

/**
 * Get room icon based on room name
 */
const getRoomIcon = (roomName: string): typeof Home => {
  const name = roomName.toLowerCase();

  if (name.includes('living') || name.includes('lounge')) {
    return Home;
  }
  // Add more room types as needed
  return Home;
};

/**
 * RoomCard - Collapsible card grouping devices by room
 *
 * Features:
 * - Room-level quick actions (all lights on/off)
 * - Device count and status summary
 * - Collapsible device list
 * - Visual indicators for active devices
 * - Touch-optimized controls
 *
 * @example
 * ```tsx
 * <RoomCard
 *   room="Living Room"
 *   devices={livingRoomDevices}
 *   onAllLightsOn={() => turnOnAllLights('living_room')}
 *   onAllLightsOff={() => turnOffAllLights('living_room')}
 * />
 * ```
 */
export const RoomCard = forwardRef<HTMLDivElement, RoomCardProps>(
  (
    {
      room,
      devices,
      initiallyExpanded = false,
      onAllLightsOn,
      onAllLightsOff,
      className,
      ...props
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

    const Icon = getRoomIcon(room);

    // Calculate room statistics
    const stats = useMemo(() => {
      const lights = devices.filter(d => d.type === 'light');
      const lightsOn = lights.filter(d => d.state === 'on').length;

      const mediaPlayers = devices.filter(d => d.type === 'media_player');
      const mediaPlaying = mediaPlayers.filter(d => d.state === 'playing').length;

      const climate = devices.filter(d => d.type === 'climate');
      const climateActive = climate.filter(d =>
        d.attrs?.['hvac_action'] === 'heating' || d.attrs?.['hvac_action'] === 'cooling'
      ).length;

      const avgTemp = climate.length > 0
        ? climate.reduce((sum, d) => sum + (Number(d.attrs?.['current_temperature']) || 0), 0) / climate.length
        : null;

      return {
        total: devices.length,
        lights: lights.length,
        lightsOn,
        mediaPlayers: mediaPlayers.length,
        mediaPlaying,
        climate: climate.length,
        climateActive,
        avgTemp,
        hasActiveDevices: lightsOn > 0 || mediaPlaying > 0 || climateActive > 0,
      };
    }, [devices]);

    return (
      <div ref={ref} {...props}>
      <Card
        className={`
          transition-all duration-200
          ${stats.hasActiveDevices ? 'border-primary/30 bg-primary/5' : ''}
          ${className || ''}
        `}
      >
        {/* Room Header */}
        <div
          className="p-4 cursor-pointer hover:bg-surface/50 transition-colors duration-200 rounded-t-lg"
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Room info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`
                p-2 rounded-lg
                ${stats.hasActiveDevices ? 'bg-primary/20 text-primary' : 'bg-surface text-foreground/60'}
              `}>
                <Icon size={24} />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {room}
                </h2>
                <div className="flex items-center gap-3 text-xs text-foreground/60">
                  <span>{stats.total} devices</span>
                  {stats.lights > 0 && (
                    <span className={stats.lightsOn > 0 ? 'text-primary' : ''}>
                      💡 {stats.lightsOn}/{stats.lights}
                    </span>
                  )}
                  {stats.mediaPlayers > 0 && (
                    <span className={stats.mediaPlaying > 0 ? 'text-primary' : ''}>
                      🎵 {stats.mediaPlaying}/{stats.mediaPlayers}
                    </span>
                  )}
                  {stats.avgTemp !== null && (
                    <span>🌡️ {Math.round(stats.avgTemp)}°</span>
                  )}
                </div>
              </div>
            </div>

            {/* Expand/collapse icon */}
            {isExpanded ? (
              <ChevronUp size={20} className="text-foreground/60" />
            ) : (
              <ChevronDown size={20} className="text-foreground/60" />
            )}
          </div>

          {/* Quick actions (visible when collapsed) */}
          {!isExpanded && stats.lights > 0 && (
            <div
              className="flex items-center gap-2 mt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                onClick={onAllLightsOn}
                className="flex-1 h-10"
                disabled={stats.lightsOn === stats.lights}
              >
                <Lightbulb size={16} className="mr-2" />
                All On
              </Button>
              <Button
                variant="outline"
                onClick={onAllLightsOff}
                className="flex-1 h-10"
                disabled={stats.lightsOn === 0}
              >
                <Power size={16} className="mr-2" />
                All Off
              </Button>
            </div>
          )}
        </div>

        {/* Devices List (expanded) */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Room-level actions */}
            {stats.lights > 0 && (
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Button
                  variant="outline"
                  onClick={onAllLightsOn}
                  className="flex-1 h-12"
                  disabled={stats.lightsOn === stats.lights}
                >
                  <Lightbulb size={16} className="mr-2" />
                  All Lights On
                </Button>
                <Button
                  variant="outline"
                  onClick={onAllLightsOff}
                  className="flex-1 h-12"
                  disabled={stats.lightsOn === 0}
                >
                  <Power size={16} className="mr-2" />
                  All Lights Off
                </Button>
              </div>
            )}

            {/* Device cards */}
            <div className="grid grid-cols-1 gap-3">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                />
              ))}
            </div>
          </div>
        )}
      </Card>
      </div>
    );
  }
);

RoomCard.displayName = 'RoomCard';
