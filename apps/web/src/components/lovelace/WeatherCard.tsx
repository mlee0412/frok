'use client';

import React from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';

export interface WeatherData {
  temperature?: number;
  condition?: string;
  humidity?: number;
  wind_speed?: number;
  wind_bearing?: number;
  forecast?: Array<{
    temperature?: number;
    templow?: number;
    temphigh?: number;
    precipitation_probability?: number;
  }>;
}

export interface WeatherCardProps {
  data: WeatherData;
  height?: string;
}

export function WeatherCard({ data, height = '58px' }: WeatherCardProps) {
  const forecast = data.forecast?.[0] || {};
  const high = forecast.temphigh != null ? Math.round(forecast.temphigh) : null;
  const low = forecast.templow != null ? Math.round(forecast.templow) : null;
  const pop = forecast.precipitation_probability != null ? `${forecast.precipitation_probability}%` : '--';

  const gradient = gradients['dark-cyan'];

  return (
    <BaseCard
      name="Today"
      icon="🌡️"
      isActive={true}
      gradient={gradient}
      height={height}
    >
      <div className="flex items-center justify-between w-full px-2">
        <div style={{ fontSize: '11px', fontWeight: 700, color: gradient.textColor }}>
          Today
        </div>
        <div style={{ fontSize: '11px', color: gradient.textColor }}>
          H {high != null ? `${high}°` : '--'} / L {low != null ? `${low}°` : '--'} • POP {pop}
        </div>
      </div>
    </BaseCard>
  );
}
