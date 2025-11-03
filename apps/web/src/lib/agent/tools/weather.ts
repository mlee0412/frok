/**
 * Weather Tool
 *
 * Phase 3.1: Smart Dashboard Integrations - Weather
 *
 * Provides weather information using OpenWeatherMap API.
 * Supports current weather, forecasts, and location-based queries.
 *
 * Features:
 * - Current weather conditions
 * - 5-day forecast
 * - Location-based (city name, coordinates, zip code)
 * - Temperature, humidity, wind speed, conditions
 * - Natural language queries ("What's the weather like in Seoul?")
 *
 * API: OpenWeatherMap Free Tier
 * - 1,000 calls/day
 * - 60 calls/minute
 * - No credit card required
 */

import { tool } from '@openai/agents';
import { z } from 'zod';

/**
 * Weather Tool Parameters
 */
const WeatherParametersSchema = z.object({
  location: z
    .string()
    .min(1)
    .describe('Location name (city, country) or coordinates (lat,lon)'),
  type: z
    .enum(['current', 'forecast'])
    .default('current')
    .describe('Type of weather data to fetch'),
  units: z
    .enum(['metric', 'imperial'])
    .default('metric')
    .describe('Temperature units (metric = Celsius, imperial = Fahrenheit)'),
});

export type WeatherParameters = z.infer<typeof WeatherParametersSchema>;

/**
 * Weather data types
 */
export type CurrentWeather = {
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
  timezone: string;
  units: 'metric' | 'imperial';
};

export type ForecastDay = {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  clouds: number;
};

export type WeatherForecast = {
  location: string;
  country: string;
  forecast: ForecastDay[];
  units: 'metric' | 'imperial';
};

/**
 * Fetch current weather from OpenWeatherMap API
 */
async function fetchCurrentWeather(
  location: string,
  units: 'metric' | 'imperial'
): Promise<CurrentWeather> {
  const apiKey = process.env['OPENWEATHER_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'OPENWEATHER_API_KEY environment variable not configured. Please sign up at https://openweathermap.org/api and add your API key to .env'
    );
  }

  // Determine if location is coordinates or city name
  const isCoordinates = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location);

  const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  const queryParams = new URLSearchParams({
    appid: apiKey,
    units,
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

  const url = `${baseUrl}?${queryParams.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `OpenWeatherMap API error: ${error['message'] || 'Unknown error'}`
    );
  }

  const data = await response.json();

  // Transform API response to our format
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
    timezone: data['timezone'] as string,
    units,
  };
}

/**
 * Fetch 5-day weather forecast from OpenWeatherMap API
 */
async function fetchWeatherForecast(
  location: string,
  units: 'metric' | 'imperial'
): Promise<WeatherForecast> {
  const apiKey = process.env['OPENWEATHER_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'OPENWEATHER_API_KEY environment variable not configured. Please sign up at https://openweathermap.org/api and add your API key to .env'
    );
  }

  // Determine if location is coordinates or city name
  const isCoordinates = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location);

  const baseUrl = 'https://api.openweathermap.org/data/2.5/forecast';
  const queryParams = new URLSearchParams({
    appid: apiKey,
    units,
    cnt: '40', // 5 days * 8 readings per day (every 3 hours)
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

  const url = `${baseUrl}?${queryParams.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `OpenWeatherMap API error: ${error['message'] || 'Unknown error'}`
    );
  }

  const data = await response.json();

  // Group forecast data by day
  const forecastByDay = new Map<string, ForecastDay>();

  for (const item of data['list'] as unknown[]) {
    const itemData = item as Record<string, unknown>;
    const dateStr = (itemData['dt_txt'] as string).split(' ')[0] as string; // "2025-11-02"

    if (!forecastByDay.has(dateStr)) {
      const main = itemData['main'] as Record<string, unknown>;
      const weather = (itemData['weather'] as unknown[])[0] as Record<
        string,
        unknown
      >;
      const wind = itemData['wind'] as Record<string, unknown>;
      const clouds = itemData['clouds'] as Record<string, unknown>;

      forecastByDay.set(dateStr, {
        date: dateStr,
        temp_min: Math.round(main['temp_min'] as number),
        temp_max: Math.round(main['temp_max'] as number),
        description: weather['description'] as string,
        icon: weather['icon'] as string,
        humidity: main['humidity'] as number,
        wind_speed: wind['speed'] as number,
        clouds: clouds['all'] as number,
      });
    } else {
      // Update min/max temperatures
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
    forecast: Array.from(forecastByDay.values()).slice(0, 5), // Next 5 days
    units,
  };
}

/**
 * Format weather data for natural language response
 */
function formatWeatherResponse(weather: CurrentWeather): string {
  const tempUnit = weather.units === 'metric' ? '°C' : '°F';
  const windUnit = weather.units === 'metric' ? 'm/s' : 'mph';

  return `Current weather in ${weather.location}, ${weather.country}:
🌡️ Temperature: ${weather.temperature}${tempUnit} (feels like ${weather.feels_like}${tempUnit})
📊 Conditions: ${weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}
💧 Humidity: ${weather.humidity}%
💨 Wind: ${weather.wind_speed} ${windUnit}
☁️ Cloudiness: ${weather.clouds}%
🌅 Sunrise: ${new Date(weather.sunrise).toLocaleTimeString()}
🌇 Sunset: ${new Date(weather.sunset).toLocaleTimeString()}`;
}

/**
 * Format forecast data for natural language response
 */
function formatForecastResponse(forecast: WeatherForecast): string {
  const tempUnit = forecast.units === 'metric' ? '°C' : '°F';

  let response = `5-day weather forecast for ${forecast.location}, ${forecast.country}:\n\n`;

  for (const day of forecast.forecast) {
    const date = new Date(day.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    response += `📅 ${date}: ${day.temp_min}${tempUnit} - ${day.temp_max}${tempUnit}, ${day.description}\n`;
  }

  return response.trim();
}

/**
 * Weather Agent Tool
 *
 * Enables natural language weather queries like:
 * - "What's the weather in Seoul?"
 * - "Give me a 5-day forecast for New York"
 * - "What's the temperature in Tokyo?"
 */
export const weatherTool = tool({
  name: 'weather',
  description:
    'Get current weather conditions or 5-day forecast for any location worldwide. Supports city names, coordinates, and natural language queries.',
  parameters: WeatherParametersSchema,
  async execute({ location, type, units }) {
    try {
      // Type assertions for validated parameters
      const validLocation = location as string;
      const validUnits = units as 'metric' | 'imperial';

      if (type === 'current') {
        const weather = await fetchCurrentWeather(validLocation, validUnits);
        return JSON.stringify({
          ok: true,
          type: 'current',
          data: weather,
          formatted: formatWeatherResponse(weather),
        });
      } else {
        const forecast = await fetchWeatherForecast(validLocation, validUnits);
        return JSON.stringify({
          ok: true,
          type: 'forecast',
          data: forecast,
          formatted: formatForecastResponse(forecast),
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({
        ok: false,
        error: errorMessage,
        hint:
          'Try using a valid city name (e.g., "Seoul", "New York, US") or coordinates (e.g., "37.5665,126.9780")',
      });
    }
  },
});
