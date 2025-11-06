'use client';

/**
 * MobileHeader Component
 *
 * Mobile-only header displayed on screens < 768px.
 * Provides quick access to time, weather, and smart home controls.
 *
 * Layout:
 * ┌────────────────────────────────────────────┐
 * │ [Clock] [Weather] [Spacer] [Panel] [Light] │
 * └────────────────────────────────────────────┘
 *
 * Features:
 * - Digital clock with date/day/time
 * - Compact weather badge
 * - Smart home control panel shortcut
 * - "All Lights" on/off toggle
 * - Long-press radial menu for quick actions
 * - Mobile-only (hidden on desktop)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DigitalClock } from '@frok/ui';
import { WeatherBadge } from './WeatherBadge';
import { useToast } from '@frok/ui';
import { RadialMenu, type RadialMenuAction } from './RadialMenu';

export interface MobileHeaderProps {
  /**
   * User's preferred time format
   * @default '12h'
   */
  timeFormat?: '12h' | '24h';

  /**
   * User's locale for formatting
   * @default 'en-US'
   */
  locale?: string;

  /**
   * Weather location
   * @default 'Seoul'
   */
  weatherLocation?: string;

  /**
   * Temperature units
   * @default 'imperial'
   */
  temperatureUnits?: 'metric' | 'imperial';

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function MobileHeader({
  timeFormat = '12h',
  locale = 'en-US',
  weatherLocation = 'Seoul',
  temperatureUnits = 'imperial',
  className,
}: MobileHeaderProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [lightsOn, setLightsOn] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Navigate to smart home control panel
  const handlePanelClick = () => {
    router.push('/dashboard/smart-home');
  };

  // Navigate to weather page/dashboard
  const handleWeatherClick = () => {
    router.push('/dashboard');
  };

  // Toggle all lights on/off
  const handleLightsToggle = async () => {
    setIsToggling(true);

    try {
      const response = await fetch('/api/ha/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'light',
          service: lightsOn ? 'turn_off' : 'turn_on',
          entity_id: 'all',
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to control lights');
      }

      setLightsOn(!lightsOn);
      success(`All lights turned ${lightsOn ? 'off' : 'on'}`);
    } catch (err: unknown) {
      console.error('[MobileHeader] Lights toggle error:', err);
      error(err instanceof Error ? err.message : 'Failed to control lights');
    } finally {
      setIsToggling(false);
    }
  };

  // Radial menu actions
  const radialMenuActions: RadialMenuAction[] = [
    // Volume mute (Sonos)
    {
      id: 'volume-mute',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ),
      label: 'Mute',
      onClick: async () => {
        try {
          const response = await fetch('/api/ha/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: 'media_player',
              service: 'volume_mute',
              entity_id: 'media_player.sonos',
              service_data: { is_volume_muted: true },
            }),
          });

          const data = await response.json();
          if (!data.ok) {
            throw new Error(data.error || 'Failed to mute volume');
          }

          success('Sonos muted');
        } catch (err: unknown) {
          console.error('[RadialMenu] Mute error:', err);
          error(err instanceof Error ? err.message : 'Failed to mute');
        }
      },
    },

    // Play/pause (Living room media player)
    {
      id: 'play-pause',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      label: 'Play',
      onClick: async () => {
        try {
          const response = await fetch('/api/ha/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: 'media_player',
              service: 'media_play_pause',
              entity_id: 'media_player.living_room',
            }),
          });

          const data = await response.json();
          if (!data.ok) {
            throw new Error(data.error || 'Failed to control playback');
          }

          success('Playback toggled');
        } catch (err: unknown) {
          console.error('[RadialMenu] Play/pause error:', err);
          error(err instanceof Error ? err.message : 'Failed to toggle playback');
        }
      },
    },

    // Temperature (Placeholder for future)
    {
      id: 'temperature',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      label: 'Climate',
      onClick: async () => {
        success('Climate control coming soon');
      },
    },

    // Scene (Placeholder for future)
    {
      id: 'scene',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
      label: 'Scene',
      onClick: async () => {
        success('Scene selection coming soon');
      },
    },

    // Lock/Unlock (Placeholder for future)
    {
      id: 'lock',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      label: 'Lock',
      onClick: async () => {
        success('Lock control coming soon');
      },
    },

    // Camera (Placeholder for future)
    {
      id: 'camera',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      label: 'Camera',
      onClick: async () => {
        success('Camera view coming soon');
      },
    },
  ];

  return (
    <>
      <header
        className={`md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-surface/80 backdrop-blur-sm border-b border-border ${className || ''}`}
      >
        {/* Left: Clock + Weather */}
        <div className="flex items-center gap-3">
          <DigitalClock
            format={timeFormat}
            locale={locale}
            showDate={true}
            showDay={true}
            className="text-foreground"
          />

          <div className="w-px h-4 bg-border" /> {/* Separator */}

          <WeatherBadge
            location={weatherLocation}
            units={temperatureUnits}
            onClick={handleWeatherClick}
          />
        </div>

        {/* Right: Smart Home Controls */}
        <div className="flex items-center gap-2">
          {/* Control Panel Shortcut */}
          <button
            onClick={handlePanelClick}
            className="p-2 rounded-md hover:bg-surface/70 transition-colors active:scale-95"
            aria-label="Open smart home control panel"
            title="Control Panel"
          >
            <svg
              className="w-5 h-5 text-foreground/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>

          {/* All Lights Toggle */}
          <button
            onClick={handleLightsToggle}
            disabled={isToggling}
            className={`p-2 rounded-md transition-all active:scale-95 ${
              lightsOn
                ? 'bg-primary/20 text-primary'
                : 'hover:bg-surface/70 text-foreground/60'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={lightsOn ? 'Turn all lights off' : 'Turn all lights on'}
            title={lightsOn ? 'Lights On' : 'Lights Off'}
          >
            {isToggling ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5"
                fill={lightsOn ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Radial Menu (Mobile-only, long-press activated) */}
      <div className="md:hidden">
        <RadialMenu actions={radialMenuActions} threshold={800} />
      </div>
    </>
  );
}
