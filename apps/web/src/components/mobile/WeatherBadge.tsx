'use client';

/**
 * WeatherBadge Component
 *
 * Simplified weather widget for mobile header.
 * Displays current temperature and weather icon.
 *
 * Features:
 * - Compact display (icon + temperature)
 * - Auto-refresh every 30 minutes
 * - Loading and error states
 * - Supports metric/imperial units
 * - Clickable to navigate to full weather page
 */

import { useState, useEffect } from 'react';

type WeatherData = {
  location: string;
  country: string;
  temperature: number;
  description: string;
  icon: string;
  units: 'metric' | 'imperial';
};

export interface WeatherBadgeProps {
  /**
   * Location for weather data
   * @default 'Seoul'
   */
  location?: string;

  /**
   * Temperature units
   * @default 'imperial'
   */
  units?: 'metric' | 'imperial';

  /**
   * Update interval in milliseconds
   * @default 1800000 (30 minutes)
   */
  updateInterval?: number;

  /**
   * Click handler for navigation
   */
  onClick?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function WeatherBadge({
  location = 'Seoul',
  units = 'imperial',
  updateInterval = 30 * 60 * 1000, // 30 minutes
  onClick,
  className,
}: WeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/weather?location=${encodeURIComponent(location)}&type=current&units=${units}`
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch weather');
      }

      setWeather(data.data as WeatherData);
    } catch (err: unknown) {
      console.error('[WeatherBadge] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchWeather();

    const interval = setInterval(fetchWeather, updateInterval);
    return () => clearInterval(interval);
  }, [location, units, updateInterval]);

  // Helper functions
  const getTempUnit = () => (units === 'metric' ? '°C' : '°F');
  const getWeatherIcon = (icon: string) =>
    `https://openweathermap.org/img/wn/${icon}@2x.png`;

  // Loading state
  if (loading && !weather) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface/50 ${className || ''}`}
      >
        <div className="w-6 h-6 rounded-full bg-border animate-pulse" />
        <div className="w-8 h-4 bg-border rounded animate-pulse" />
      </div>
    );
  }

  // Error state - show minimal error indicator
  if (error || !weather) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface/50 text-foreground/50 text-xs ${className || ''}`}
        aria-label="Weather unavailable"
        title="Weather unavailable - click to retry"
      >
        ⚠️ --°
      </button>
    );
  }

  // Success state
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface/50 hover:bg-surface/70 transition-colors ${className || ''}`}
      aria-label={`${weather.temperature}${getTempUnit()}, ${weather.description}`}
      title={`${weather.location}: ${weather.temperature}${getTempUnit()}, ${weather.description}`}
    >
      <img
        src={getWeatherIcon(weather.icon)}
        alt={weather.description}
        className="w-6 h-6"
      />
      <span className="text-sm font-medium text-foreground tabular-nums">
        {weather.temperature}{getTempUnit()}
      </span>
    </button>
  );
}
