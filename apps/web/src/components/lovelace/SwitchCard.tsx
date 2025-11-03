'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { getStateGradient, type GradientPreset } from './theme';

export interface SwitchEntity {
  id: string;
  name: string;
  state: 'on' | 'off';
  type: 'switch';
  icon?: string;
}

export interface SwitchCardProps {
  entity: SwitchEntity;
  gradient?: GradientPreset;
  height?: string;
  onToggle?: (entityId: string) => Promise<void>;
}

export function SwitchCard({
  entity,
  gradient,
  height = '100px',
  onToggle,
}: SwitchCardProps) {
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

  const isOn = entity.state === 'on';
  const themeGradient = getStateGradient('switch', entity.state, gradient);

  return (
    <BaseCard
      name={entity.name}
      icon={entity.icon || '🔌'}
      state={entity.state}
      isActive={isOn}
      gradient={themeGradient}
      height={height}
      onClick={onToggle ? handleToggle : undefined}
      disabled={pending}
      loading={pending}
      pulse={isOn}
    />
  );
}
