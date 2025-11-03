'use client';

import React from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';

export interface ClimateEntity {
  id: string;
  name: string;
  state: string;
  type: 'climate';
  attrs?: {
    temperature?: number;
    target_temp?: number;
    target_temperature?: number;
    current_temperature?: number;
    hvac_mode?: string;
    hvac_action?: string;
  };
}

export interface ClimateCardProps {
  entity: ClimateEntity;
  height?: string;
  onMore?: (entityId: string) => void;
}

export function ClimateCard({
  entity,
  height = '200px',
  onMore,
}: ClimateCardProps) {
  const attrs = entity.attrs || {};
  const currentTemp = attrs.current_temperature != null
    ? Math.round(attrs.current_temperature)
    : null;
  const targetTemp = attrs.target_temp || attrs.target_temperature;
  const hvacMode = attrs.hvac_mode || entity.state;
  const hvacAction = attrs.hvac_action;

  // Determine gradient based on hvac_action
  let gradient = gradients['blue-purple'];
  if (hvacAction === 'heating') {
    gradient = gradients['red-pink'];
  } else if (hvacAction === 'cooling') {
    gradient = gradients['cyan-blue'];
  } else if (hvacMode === 'off') {
    gradient = gradients['off-state'];
  }

  const label = hvacAction
    ? `${hvacAction.charAt(0).toUpperCase()}${hvacAction.slice(1)}`
    : hvacMode;

  const handleLongPress = () => {
    if (onMore) {
      onMore(entity.id);
    }
  };

  return (
    <BaseCard
      name={entity.name}
      icon="🌡️"
      isActive={hvacMode !== 'off'}
      gradient={gradient}
      height={height}
      onLongPress={onMore ? handleLongPress : undefined}
    >
      <div className="flex flex-col items-center justify-center h-full gap-2">
        {/* Current temperature (large) */}
        {currentTemp != null && (
          <div
            style={{
              fontSize: '48px',
              fontWeight: 300,
              color: gradient.textColor,
              textShadow: `0 0 20px ${gradient.iconColor}`,
            }}
          >
            {currentTemp}°
          </div>
        )}

        {/* Target temperature */}
        {targetTemp != null && (
          <div
            style={{
              fontSize: '16px',
              color: gradient.textColor,
              opacity: 0.8,
            }}
          >
            Target: {Math.round(targetTemp)}°
          </div>
        )}

        {/* Mode/Action */}
        <div
          style={{
            fontSize: '12px',
            color: gradient.textColor,
            opacity: 0.7,
            textTransform: 'capitalize',
          }}
        >
          {label}
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: '11px',
            color: gradient.textColor,
            opacity: 0.6,
            marginTop: '8px',
          }}
        >
          {entity.name}
        </div>
      </div>
    </BaseCard>
  );
}
