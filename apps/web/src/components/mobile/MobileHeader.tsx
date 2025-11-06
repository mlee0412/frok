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
 * - Mobile-only (hidden on desktop)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DigitalClock } from '@frok/ui';
import { WeatherBadge } from './WeatherBadge';
import { useToast } from '@frok/ui';

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

  return (
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
  );
}
