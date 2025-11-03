'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { gradients, type GradientPreset } from './theme';

export interface SceneEntity {
  id: string;
  name: string;
  type: 'scene';
  icon?: string;
}

export interface SceneCardProps {
  entity: SceneEntity;
  gradient: GradientPreset;
  height?: string;
  onActivate?: (sceneId: string) => Promise<void>;
}

export function SceneCard({
  entity,
  gradient,
  height = '75px',
  onActivate,
}: SceneCardProps) {
  const [pending, setPending] = useState(false);

  const handleActivate = async () => {
    if (!onActivate || pending) return;
    setPending(true);
    try {
      await onActivate(entity.id);
    } finally {
      setPending(false);
    }
  };

  const themeGradient = gradients[gradient] || gradients['purple-magenta'];

  return (
    <BaseCard
      name={entity.name}
      icon={entity.icon || '🎬'}
      isActive={true}
      gradient={themeGradient}
      height={height}
      onClick={onActivate ? handleActivate : undefined}
      disabled={pending}
      loading={pending}
    />
  );
}
