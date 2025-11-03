'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';

export interface CoverEntity {
  id: string;
  name: string;
  state: 'open' | 'closed' | 'opening' | 'closing' | string;
  type: 'cover';
  attrs?: {
    current_position?: number;
  };
}

export interface CoverCardProps {
  entity: CoverEntity;
  height?: string;
  onOpen?: (entityId: string) => Promise<void>;
  onClose?: (entityId: string) => Promise<void>;
  onStop?: (entityId: string) => Promise<void>;
}

export function CoverCard({
  entity,
  height = '120px',
  onOpen,
  onClose,
  onStop,
}: CoverCardProps) {
  const [pending, setPending] = useState(false);

  const isClosed = entity.state === 'closed';
  const isMoving = entity.state === 'opening' || entity.state === 'closing';

  // Determine gradient and icon
  let gradient = gradients['green-teal'];
  let icon = '📂';
  if (isClosed) {
    gradient = gradients['dark-red'];
    icon = '🗂️';
  } else if (entity.state === 'opening') {
    gradient = gradients['cyan-blue'];
    icon = '⬆️';
  } else if (entity.state === 'closing') {
    gradient = gradients['cyan-blue'];
    icon = '⬇️';
  }

  const position = entity.attrs?.current_position;

  return (
    <BaseCard
      name={entity.name}
      icon={icon}
      state={entity.state}
      label={position != null ? `${position}%` : undefined}
      isActive={!isClosed}
      gradient={gradient}
      height={height}
      disabled={pending}
      loading={pending}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span style={{ fontSize: '40px' }}>{icon}</span>
          <div className="flex-1">
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: gradient.textColor }}>
              {entity.name}
            </div>
            <div style={{ fontSize: '12px', color: gradient.textColor, opacity: 0.7 }}>
              {entity.state} {position != null && `• ${position}%`}
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex gap-2 mt-auto">
          {onOpen && (
            <button
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onOpen(entity.id);
                } finally {
                  setPending(false);
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'rgba(0,255,128,0.2)',
                border: '1px solid rgba(0,255,128,0.5)',
                color: '#00FF80',
              }}
            >
              Open
            </button>
          )}
          {onStop && isMoving && (
            <button
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onStop(entity.id);
                } finally {
                  setPending(false);
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'rgba(255,200,0,0.2)',
                border: '1px solid rgba(255,200,0,0.5)',
                color: '#FFC800',
              }}
            >
              Stop
            </button>
          )}
          {onClose && (
            <button
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onClose(entity.id);
                } finally {
                  setPending(false);
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'rgba(255,0,128,0.2)',
                border: '1px solid rgba(255,0,128,0.5)',
                color: '#FF0080',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </BaseCard>
  );
}
