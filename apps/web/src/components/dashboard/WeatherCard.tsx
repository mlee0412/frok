'use client';

/**
 * WeatherCard Component
 *
 * Phase 3.1: Smart Dashboard Integrations - Weather
 *
 * Displays current weather conditions and 5-day forecast in the dashboard.
 * Fetches data from /api/weather endpoint using OpenWeatherMap API.
 *
 * Features:
 * - Current temperature and conditions
 * - Feels like temperature
 * - Humidity, wind speed, pressure
 * - Weather icon
 * - 5-day forecast view (toggleable)
 * - Location search
 * - Unit switching (Celsius/Fahrenheit)
 * - Auto-refresh every 30 minutes
 */

import { useState, useEffect } from 'react';
import { Card } from '@frok/ui';

type CurrentWeather = {
  location: string;
  country: string;
  temperature: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  clouds: number;
  description: string;
  icon: string;
  sunrise: string;
  sunset: string;
  units: 'metric' | 'imperial';
};

type ForecastDay = {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
};

type WeatherForecast = {
  location: string;
  country: string;
  forecast: ForecastDay[];
  units: 'metric' | 'imperial';
};

type WeatherCardProps = {
  defaultLocation?: string;
  defaultUnits?: 'metric' | 'imperial';
};

export function WeatherCard({
  defaultLocation = 'Seoul',
  defaultUnits = 'imperial', // Changed to imperial for US users
}: WeatherCardProps) {
  const [location, setLocation] = useState(defaultLocation);
  const [units, setUnits] = useState<'metric' | 'imperial'>(defaultUnits);
  const [showForecast, setShowForecast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(
    null
  );
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);

  // Detect user's current location using browser geolocation
  const detectLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        console.log('Location detected:', coords);
        setLocation(coords);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        // Fall back to default location if user denies permission
        setLocation(defaultLocation);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  // Fetch current weather
  const fetchCurrentWeather = async () => {
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

      setCurrentWeather(data.data as CurrentWeather);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch 5-day forecast
  const fetchForecast = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/weather?location=${encodeURIComponent(location)}&type=forecast&units=${units}`
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch forecast');
      }

      setForecast(data.data as WeatherForecast);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Detect location on mount (only once)
  useEffect(() => {
    detectLocation();
  }, []); // Run only on mount

  // Initial fetch and auto-refresh every 30 minutes
  useEffect(() => {
    // Only fetch if location is set
    if (location) {
      fetchCurrentWeather();

      const interval = setInterval(fetchCurrentWeather, 30 * 60 * 1000); // 30 minutes
      return () => clearInterval(interval);
    }
  }, [location, units]);

  // Fetch forecast when toggling to forecast view
  useEffect(() => {
    if (showForecast && !forecast) {
      fetchForecast();
    }
  }, [showForecast]);

  // Helper functions
  const getTempUnit = () => (units === 'metric' ? '°C' : '°F');
  const getWindUnit = () => (units === 'metric' ? 'm/s' : 'mph');

  const getWeatherIcon = (icon: string) =>
    `https://openweathermap.org/img/wn/${icon}@2x.png`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWindDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Weather</h2>
        <div className="flex items-center gap-2">
          {/* Location detection */}
          <button
            onClick={detectLocation}
            className="p-2 text-sm border border-border rounded-md hover:bg-surface-lighter transition-colors"
            aria-label="Detect my location"
            title="Detect my location"
            disabled={loading}
          >
            📍
          </button>

          {/* Unit toggle */}
          <button
            onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}
            className="px-3 py-1 text-sm border border-border rounded-md hover:bg-surface-lighter transition-colors"
            aria-label={`Switch to ${units === 'metric' ? 'Fahrenheit' : 'Celsius'}`}
          >
            {units === 'metric' ? '°C' : '°F'}
          </button>

          {/* Forecast toggle */}
          <button
            onClick={() => setShowForecast(!showForecast)}
            className="px-3 py-1 text-sm border border-border rounded-md hover:bg-surface-lighter transition-colors"
            aria-label={showForecast ? 'Show current weather' : 'Show forecast'}
          >
            {showForecast ? 'Current' : 'Forecast'}
          </button>

          {/* Refresh */}
          <button
            onClick={showForecast ? fetchForecast : fetchCurrentWeather}
            className="p-2 text-sm border border-border rounded-md hover:bg-surface-lighter transition-colors"
            aria-label="Refresh weather"
            disabled={loading}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !currentWeather && !forecast && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-md text-danger">
          <p className="font-medium">Failed to load weather</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={showForecast ? fetchForecast : fetchCurrentWeather}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Current Weather View */}
      {!showForecast && currentWeather && !error && (
        <div>
          {/* Location */}
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-foreground">
              {currentWeather.location}, {currentWeather.country}
            </h3>
            <p className="text-sm text-foreground/70 capitalize">
              {currentWeather.description}
            </p>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <img
              src={getWeatherIcon(currentWeather.icon)}
              alt={currentWeather.description}
              className="w-24 h-24"
            />
            <div>
              <div className="text-5xl font-bold text-foreground">
                {currentWeather.temperature}
                {getTempUnit()}
              </div>
              <div className="text-sm text-foreground/70">
                Feels like {currentWeather.feels_like}
                {getTempUnit()}
              </div>
            </div>
          </div>

          {/* Weather Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>💧</span>
              <div>
                <div className="text-foreground/70">Humidity</div>
                <div className="font-medium text-foreground">
                  {currentWeather.humidity}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>💨</span>
              <div>
                <div className="text-foreground/70">Wind</div>
                <div className="font-medium text-foreground">
                  {currentWeather.wind_speed} {getWindUnit()}{' '}
                  {getWindDirection(currentWeather.wind_deg)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>🌡️</span>
              <div>
                <div className="text-foreground/70">High / Low</div>
                <div className="font-medium text-foreground">
                  {currentWeather.temp_max}° / {currentWeather.temp_min}°
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>☁️</span>
              <div>
                <div className="text-foreground/70">Cloudiness</div>
                <div className="font-medium text-foreground">
                  {currentWeather.clouds}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast View */}
      {showForecast && forecast && !error && (
        <div>
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              5-Day Forecast: {forecast.location}, {forecast.country}
            </h3>
          </div>

          <div className="space-y-3">
            {forecast.forecast.map((day, index) => (
              <div
                key={day.date}
                className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-surface-lighter transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src={getWeatherIcon(day.icon)}
                    alt={day.description}
                    className="w-12 h-12"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {index === 0 ? 'Today' : formatDate(day.date)}
                    </div>
                    <div className="text-sm text-foreground/70 capitalize">
                      {day.description}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-foreground">
                    {day.temp_max}° / {day.temp_min}°
                  </div>
                  <div className="text-sm text-foreground/70">
                    💧 {day.humidity}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
