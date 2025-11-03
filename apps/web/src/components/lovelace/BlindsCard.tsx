'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';

export interface BlindsEntity {
  id: string;
  name: string;
  state: 'open' | 'closed' | 'opening' | 'closing' | string;
  type: 'cover';
  attrs?: {
    current_position?: number;
  };
}

export interface BlindsCardProps {
  entity: BlindsEntity;
  height?: string;
  onOpen?: (entityId: string) => Promise<void>;
  onClose?: (entityId: string) => Promise<void>;
  onStop?: (entityId: string) => Promise<void>;
  onSetPosition?: (entityId: string, position: number) => Promise<void>;
}

export function BlindsCard({
  entity,
  height = '160px',
  onOpen,
  onClose,
  onStop,
  onSetPosition,
}: BlindsCardProps) {
  const [pending, setPending] = useState(false);
  const [showPositionControl, setShowPositionControl] = useState(false);

  const isClosed = entity.state === 'closed';
  const isMoving = entity.state === 'opening' || entity.state === 'closing';
  const position = entity.attrs?.current_position ?? (isClosed ? 0 : 100);

  // Determine gradient and icon based on state
  let gradient = gradients['green-teal'];
  let icon = '🪟';
  let stateLabel = 'Open';

  if (isClosed) {
    gradient = gradients['dark-blue'];
    icon = '🚪';
    stateLabel = 'Closed';
  } else if (entity.state === 'opening') {
    gradient = gradients['cyan-blue'];
    icon = '⬆️';
    stateLabel = 'Opening';
  } else if (entity.state === 'closing') {
    gradient = gradients['cyan-blue'];
    icon = '⬇️';
    stateLabel = 'Closing';
  }

  const handleSetPosition = async (newPosition: number) => {
    if (!onSetPosition || pending) return;
    setPending(true);
    try {
      await onSetPosition(entity.id, newPosition);
    } finally {
      setPending(false);
    }
  };

  return (
    <BaseCard
      name={entity.name}
      icon={icon}
      state={stateLabel}
      label={`${position}%`}
      isActive={!isClosed}
      gradient={gradient}
      height={height}
      disabled={pending}
      loading={pending}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: '32px' }}>{icon}</span>
          <div className="flex-1">
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: gradient.textColor }}>
              {entity.name}
            </div>
            <div style={{ fontSize: '12px', color: gradient.textColor, opacity: 0.7 }}>
              {stateLabel} • {position}%
            </div>
          </div>
        </div>

        {/* Position Bar */}
        <div className="mb-3">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${position}%`,
                background: isClosed
                  ? 'linear-gradient(90deg, rgba(100,149,237,0.6), rgba(100,149,237,0.8))'
                  : 'linear-gradient(90deg, rgba(0,255,128,0.6), rgba(0,255,128,0.8))',
              }}
            />
          </div>
        </div>

        {/* Quick Position Buttons */}
        {showPositionControl && onSetPosition && (
          <div className="flex gap-1 mb-2">
            {[0, 25, 50, 75, 100].map((pos) => (
              <button
                key={pos}
                disabled={pending}
                onClick={() => handleSetPosition(pos)}
                className="flex-1 py-1 rounded text-xs font-semibold transition-all"
                style={{
                  background: position === pos ? 'rgba(0,255,128,0.3)' : 'rgba(255,255,255,0.1)',
                  border: position === pos ? '1px solid rgba(0,255,128,0.6)' : '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                {pos}%
              </button>
            ))}
          </div>
        )}

        {/* Control Buttons */}
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
              className="flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(0,255,128,0.2)',
                border: '1px solid rgba(0,255,128,0.5)',
                color: '#00FF80',
              }}
            >
              ⬆️ Open
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
              className="flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(255,200,0,0.2)',
                border: '1px solid rgba(255,200,0,0.5)',
                color: '#FFC800',
              }}
            >
              ⏸️ Stop
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
              className="flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(100,149,237,0.2)',
                border: '1px solid rgba(100,149,237,0.5)',
                color: '#6495ED',
              }}
            >
              ⬇️ Close
            </button>
          )}
        </div>

        {/* Toggle Position Control */}
        {onSetPosition && (
          <button
            onClick={() => setShowPositionControl(!showPositionControl)}
            className="w-full mt-2 py-1 rounded text-xs text-foreground/60 hover:text-foreground transition-colors"
          >
            {showPositionControl ? '▲ Hide Positions' : '▼ Show Positions'}
          </button>
        )}
      </div>
    </BaseCard>
  );
}
