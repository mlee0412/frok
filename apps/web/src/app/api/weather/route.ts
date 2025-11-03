/**
 * Weather API Route
 *
 * Phase 3.1: Smart Dashboard Integrations - Weather
 *
 * Provides weather data for the dashboard WeatherCard component.
 * Uses OpenWeatherMap API to fetch current weather and forecasts.
 *
 * Endpoints:
 * - GET /api/weather?location={location}&type={current|forecast}&units={metric|imperial}
 *
 * Rate Limiting: 60 requests per minute (standard preset)
 * Authentication: Required
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Weather Query Schema
 */
const WeatherQuerySchema = z.object({
  location: z
    .string()
    .min(1)
    .default('Seoul')
    .describe('Location name (city, country) or coordinates (lat,lon)'),
  type: z
    .enum(['current', 'forecast'])
    .default('current')
    .describe('Type of weather data'),
  units: z
    .enum(['metric', 'imperial'])
    .default('metric')
    .describe('Temperature units'),
});

/**
 * Fetch current weather from OpenWeatherMap
 */
async function fetchCurrentWeather(
  location: string,
  units: 'metric' | 'imperial'
) {
  const apiKey = process.env['OPENWEATHER_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'OPENWEATHER_API_KEY not configured. Sign up at https://openweathermap.org/api'
    );
  }

  const isCoordinates = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location);
  const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  const queryParams = new URLSearchParams({ appid: apiKey, units });

  if (isCoordinates) {
    const [lat, lon] = location.split(',');
    if (!lat || !lon) {
      throw new Error('Invalid coordinates format. Use: "latitude,longitude"');
    }
    queryParams.set('lat', lat.trim());
    queryParams.set('lon', lon.trim());
  } else {
    queryParams.set('q', location);
  }

  const response = await fetch(`${baseUrl}?${queryParams.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error['message'] || 'Failed to fetch weather data');
  }

  const data = await response.json();

  return {
    location: data['name'] as string,
    country: data['sys']['country'] as string,
    temperature: Math.round(data['main']['temp'] as number),
    feels_like: Math.round(data['main']['feels_like'] as number),
    temp_min: Math.round(data['main']['temp_min'] as number),
    temp_max: Math.round(data['main']['temp_max'] as number),
    humidity: data['main']['humidity'] as number,
    pressure: data['main']['pressure'] as number,
    wind_speed: data['wind']['speed'] as number,
    wind_deg: data['wind']['deg'] as number,
    clouds: data['clouds']['all'] as number,
    description: data['weather'][0]['description'] as string,
    icon: data['weather'][0]['icon'] as string,
    sunrise: new Date((data['sys']['sunrise'] as number) * 1000).toISOString(),
    sunset: new Date((data['sys']['sunset'] as number) * 1000).toISOString(),
    units,
  };
}

/**
 * Fetch 5-day forecast from OpenWeatherMap
 */
async function fetchWeatherForecast(
  location: string,
  units: 'metric' | 'imperial'
) {
  const apiKey = process.env['OPENWEATHER_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'OPENWEATHER_API_KEY not configured. Sign up at https://openweathermap.org/api'
    );
  }

  const isCoordinates = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location);
  const baseUrl = 'https://api.openweathermap.org/data/2.5/forecast';
  const queryParams = new URLSearchParams({
    appid: apiKey,
    units,
    cnt: '40',
  });

  if (isCoordinates) {
    const [lat, lon] = location.split(',');
    if (!lat || !lon) {
      throw new Error('Invalid coordinates format. Use: "latitude,longitude"');
    }
    queryParams.set('lat', lat.trim());
    queryParams.set('lon', lon.trim());
  } else {
    queryParams.set('q', location);
  }

  const response = await fetch(`${baseUrl}?${queryParams.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error['message'] || 'Failed to fetch forecast data');
  }

  const data = await response.json();

  // Group by day
  const forecastByDay = new Map<
    string,
    {
      date: string;
      temp_min: number;
      temp_max: number;
      description: string;
      icon: string;
      humidity: number;
      wind_speed: number;
    }
  >();

  for (const item of data['list'] as unknown[]) {
    const itemData = item as Record<string, unknown>;
    const dateStr = (itemData['dt_txt'] as string).split(' ')[0] as string;

    if (!forecastByDay.has(dateStr)) {
      const main = itemData['main'] as Record<string, unknown>;
      const weather = (itemData['weather'] as unknown[])[0] as Record<
        string,
        unknown
      >;
      const wind = itemData['wind'] as Record<string, unknown>;

      forecastByDay.set(dateStr, {
        date: dateStr,
        temp_min: Math.round(main['temp_min'] as number),
        temp_max: Math.round(main['temp_max'] as number),
        description: weather['description'] as string,
        icon: weather['icon'] as string,
        humidity: main['humidity'] as number,
        wind_speed: wind['speed'] as number,
      });
    } else {
      const existing = forecastByDay.get(dateStr)!;
      const main = itemData['main'] as Record<string, unknown>;

      existing.temp_min = Math.min(
        existing.temp_min,
        Math.round(main['temp_min'] as number)
      );
      existing.temp_max = Math.max(
        existing.temp_max,
        Math.round(main['temp_max'] as number)
      );
    }
  }

  return {
    location: data['city']['name'] as string,
    country: data['city']['country'] as string,
    forecast: Array.from(forecastByDay.values()).slice(0, 5),
    units,
  };
}

/**
 * GET /api/weather
 *
 * Fetch weather data for dashboard
 */
export async function GET(req: NextRequest) {
  // Authentication
  const authResult = await withAuth(req);
  if (!authResult.ok) return authResult.response;

  // Rate limiting (60 req/min - standard preset)
  const rateLimitResult = await withRateLimit(req, {
    maxRequests: 60,
    windowMs: 60000,
  });
  if (!rateLimitResult.ok) return rateLimitResult.response;

  try {
    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = {
      location: url.searchParams.get('location') || 'Seoul',
      type: url.searchParams.get('type') || 'current',
      units: url.searchParams.get('units') || 'metric',
    };

    const validation = WeatherQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { location, type, units } = validation.data;

    // Type assertions for validated data
    const validLocation = location as string;
    const validUnits = units as 'metric' | 'imperial';

    // Fetch weather data
    if (type === 'current') {
      const weather = await fetchCurrentWeather(validLocation, validUnits);
      return NextResponse.json({
        ok: true,
        type: 'current',
        data: weather,
      });
    } else {
      const forecast = await fetchWeatherForecast(validLocation, validUnits);
      return NextResponse.json({
        ok: true,
        type: 'forecast',
        data: forecast,
      });
    }
  } catch (error: unknown) {
    console.error('[weather] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
        hint: 'Check your location name or coordinates format',
      },
      { status: 500 }
    );
  }
}
