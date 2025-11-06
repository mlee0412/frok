'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { getStateGradient, type GradientPreset } from './theme';

export interface LightEntity {
  id: string;
  name: string;
  state: 'on' | 'off';
  type: 'light';
  attrs?: {
    brightness?: number;
    brightness_pct?: number;
    color_temp_kelvin?: number;
    rgb_color?: [number, number, number];
    hs_color?: [number, number];
    xy_color?: [number, number];
    effect?: string;
    effect_list?: string[];
    supported_color_modes?: string[];
  };
}

export interface LightCardProps {
  entity: LightEntity;
  gradient?: GradientPreset;
  height?: string;
  onToggle?: (entityId: string) => Promise<void>;
  onMore?: (entityId: string) => void;
}

export function LightCard({
  entity,
  gradient,
  height = '85px',
  onToggle,
  onMore,
}: LightCardProps) {
  const [pending, setPending] = useState(false);

  const handleToggle = async () => {
    if (!onToggle || pending) return;
    setPending(true);
    try {
      await onToggle(entity.id);
    } finally {
      setPending(false);
    }
  };

  const handleLongPress = () => {
    if (onMore) {
      onMore(entity.id);
    }
  };

  const isOn = entity.state === 'on';
  const attrs = entity.attrs || {};

  // Calculate label
  let label = isOn ? 'On' : 'Off';
  if (isOn) {
    const parts: string[] = [];
    if (attrs.brightness_pct != null) {
      parts.push(`${Math.round(attrs.brightness_pct)}%`);
    } else if (attrs.brightness != null) {
      parts.push(`${Math.round((attrs.brightness / 255) * 100)}%`);
    }
    if (attrs.color_temp_kelvin != null) {
      parts.push(`${attrs.color_temp_kelvin}K`);
    }
    if (attrs.effect) {
      parts.push(attrs.effect);
    }
    if (parts.length > 0) {
      label = parts.join(' • ');
    }
  }

  // Determine gradient
  const themeGradient = getStateGradient('light', entity.state, gradient);

  return (
    <BaseCard
      name={entity.name}
      icon="💡"
      state={entity.state}
      label={label}
      isActive={isOn}
      gradient={themeGradient}
      height={height}
      onClick={onToggle ? handleToggle : undefined}
      onLongPress={onMore ? handleLongPress : undefined}
      disabled={pending}
      loading={pending}
      pulse={isOn}
    />
  );
}
