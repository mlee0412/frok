'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';
import { Blinds, ChevronsUp, ChevronsDown, Hand } from 'lucide-react';

export interface BlindsEntity {
  id: string;
  name: string;
  state: 'open' | 'closed' | 'opening' | 'closing' | string;
  type: 'cover';
  attrs?: {
    current_position?: number;
  };
}

export interface BlindsCardEnhancedProps {
  entity: BlindsEntity;
  height?: string;
  onOpen?: (entityId: string) => Promise<void>;
  onClose?: (entityId: string) => Promise<void>;
  onStop?: (entityId: string) => Promise<void>;
  onSetPosition?: (entityId: string, position: number) => Promise<void>;
}

export function BlindsCardEnhanced({
  entity,
  height = '200px',
  onOpen,
  onClose,
  onStop,
  onSetPosition,
}: BlindsCardEnhancedProps) {
  const [pending, setPending] = useState(false);
  const [showPositionControl, setShowPositionControl] = useState(false);

  const isClosed = entity.state === 'closed';
  const isMoving = entity.state === 'opening' || entity.state === 'closing';
  const position = entity.attrs?.current_position ?? (isClosed ? 0 : 100);

  // Determine gradient based on state
  let gradient = gradients['green-teal'];
  let stateLabel = 'Open';

  if (isClosed) {
    gradient = gradients['dark-blue'];
    stateLabel = 'Closed';
  } else if (entity.state === 'opening') {
    gradient = gradients['cyan-blue'];
    stateLabel = 'Opening';
  } else if (entity.state === 'closing') {
    gradient = gradients['cyan-blue'];
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
      icon=""
      state={stateLabel}
      label={`${position}%`}
      isActive={!isClosed}
      gradient={gradient}
      height={height}
      disabled={pending}
      loading={pending}
    >
      <div className="flex flex-col h-full gap-3 p-2">
        {/* Header with Icon and Progress */}
        <div className="flex items-center justify-between">
          <div className="relative">
            {/* Animated Blinds Icon with Progress Overlay */}
            <div className="relative w-16 h-16">
              {/* Background Circle */}
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Progress Arc */}
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke={isMoving ? 'rgba(34,211,238,0.8)' : isClosed ? 'rgba(100,149,237,0.8)' : 'rgba(0,255,128,0.8)'}
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${(position / 100) * 176} 176`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                  style={{
                    filter: 'drop-shadow(0 0 4px currentColor)',
                  }}
                />
              </svg>
              {/* Icon in Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Blinds
                  size={28}
                  style={{
                    color: gradient.iconColor,
                    filter: `drop-shadow(0 0 8px ${gradient.iconColor})`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* State Info */}
          <div className="flex-1 ml-3">
            <div
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: gradient.textColor,
              }}
            >
              {entity.name}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: gradient.textColor,
                opacity: 0.8,
              }}
            >
              {stateLabel} • {position}%
            </div>
            {isMoving && (
              <div className="flex items-center gap-1 mt-1">
                <div
                  className="h-1 w-20 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <div
                    className="h-full bg-primary animate-pulse"
                    style={{ width: '40%', transition: 'width 0.3s' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Position Bar */}
        <div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${position}%`,
                background: isClosed
                  ? 'linear-gradient(90deg, rgba(100,149,237,0.7), rgba(100,149,237,1))'
                  : 'linear-gradient(90deg, rgba(0,255,128,0.7), rgba(0,255,128,1))',
                boxShadow: isClosed
                  ? '0 0 8px rgba(100,149,237,0.8)'
                  : '0 0 8px rgba(0,255,128,0.8)',
              }}
            />
          </div>
        </div>

        {/* Quick Position Buttons */}
        {showPositionControl && onSetPosition && (
          <div className="grid grid-cols-5 gap-1">
            {[0, 25, 50, 75, 100].map((pos) => (
              <button
                key={pos}
                disabled={pending}
                onClick={() => handleSetPosition(pos)}
                className="py-1.5 rounded text-xs font-semibold transition-all"
                style={{
                  background: position === pos ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)',
                  border: position === pos ? '1px solid rgba(34,211,238,0.6)' : '1px solid rgba(255,255,255,0.1)',
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
        <div className="grid grid-cols-3 gap-2 mt-auto">
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
              className="flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(0,255,128,0.15)',
                border: '1px solid rgba(0,255,128,0.4)',
                color: '#00FF80',
              }}
            >
              <ChevronsUp size={18} className="mb-1" />
              <span>Open</span>
            </button>
          )}
          {/* ALWAYS SHOW STOP BUTTON */}
          {onStop && (
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
              className="flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: isMoving ? 'rgba(255,165,0,0.25)' : 'rgba(255,165,0,0.12)',
                border: isMoving ? '1px solid rgba(255,165,0,0.6)' : '1px solid rgba(255,165,0,0.3)',
                color: isMoving ? '#FFA500' : 'rgba(255,165,0,0.7)',
              }}
            >
              <Hand size={18} className="mb-1" />
              <span>Stop</span>
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
              className="flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(100,149,237,0.15)',
                border: '1px solid rgba(100,149,237,0.4)',
                color: '#6495ED',
              }}
            >
              <ChevronsDown size={18} className="mb-1" />
              <span>Close</span>
            </button>
          )}
        </div>

        {/* Toggle Position Control */}
        {onSetPosition && (
          <button
            onClick={() => setShowPositionControl(!showPositionControl)}
            className="w-full py-1.5 rounded text-xs text-foreground/60 hover:text-foreground transition-colors"
          >
            {showPositionControl ? '▲ Hide Positions' : '▼ Show Positions'}
          </button>
        )}
      </div>
    </BaseCard>
  );
}
