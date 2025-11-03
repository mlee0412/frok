'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';

export type RemoteMode = 'touchpad' | 'circlepad';

export interface RemoteAction {
  id: string;
  icon: string;
  label: string;
  entityId: string;
  service: string;
  serviceData?: Record<string, unknown>;
}

export interface MediaPlayerData {
  id: string;
  name: string;
  state: string;
  volume?: number;
  isMuted?: boolean;
}

export interface RemoteControlEnhancedProps {
  remoteId: string;
  mode: RemoteMode;
  customActions?: RemoteAction[];
  mediaPlayer?: MediaPlayerData;
  onModeChange?: (mode: RemoteMode) => void;
  onCommand?: (remoteId: string, command: string) => Promise<void>;
  onServiceCall?: (entityId: string, service: string, data?: Record<string, unknown>) => Promise<void>;
  onVolumeSet?: (entityId: string, volume: number) => Promise<void>;
  onVolumeMute?: (entityId: string, muted: boolean) => Promise<void>;
}

export function RemoteControlEnhanced({
  remoteId,
  mode,
  customActions = [],
  mediaPlayer,
  onModeChange,
  onCommand,
  onServiceCall,
  onVolumeSet,
  onVolumeMute,
}: RemoteControlEnhancedProps) {
  const [pending, setPending] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [showVolumeControls, setShowVolumeControls] = useState(false);

  const gradient = mode === 'touchpad' ? gradients['dark-cyan'] : gradients['dark-purple'];
  const activeGradient = mode === 'touchpad' ? gradients['cyan-blue'] : gradients['purple-magenta'];

  const volume = mediaPlayer?.volume ?? 0.5;
  const isMuted = mediaPlayer?.isMuted ?? false;
  const percentage = Math.round(volume * 100);

  const handleCommand = async (command: string) => {
    if (!onCommand || pending) return;
    setPending(true);
    try {
      await onCommand(remoteId, command);
    } finally {
      setPending(false);
    }
  };

  const handleServiceCall = async (action: RemoteAction) => {
    if (!onServiceCall || pending) return;
    setPending(true);
    try {
      await onServiceCall(action.entityId, action.service, action.serviceData);
    } finally {
      setPending(false);
    }
  };

  const handleVolumePreset = async (level: number) => {
    if (!onVolumeSet || !mediaPlayer || pending) return;
    setPending(true);
    try {
      await onVolumeSet(mediaPlayer.id, level);
    } finally {
      setPending(false);
    }
  };

  const handleVolumeAdjust = async (delta: number) => {
    if (!onVolumeSet || !mediaPlayer || pending) return;
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setPending(true);
    try {
      await onVolumeSet(mediaPlayer.id, newVolume);
    } finally {
      setPending(false);
    }
  };

  const handleMuteToggle = async () => {
    if (!onVolumeMute || !mediaPlayer || pending) return;
    setPending(true);
    try {
      await onVolumeMute(mediaPlayer.id, !isMuted);
    } finally {
      setPending(false);
    }
  };

  const handleTouchPadStart = (e: React.TouchEvent | React.MouseEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e;
    if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchPadEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStart) return;

    const touch = 'changedTouches' in e ? e.changedTouches[0] : e;
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const threshold = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        handleCommand(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > threshold) {
        handleCommand(deltaY > 0 ? 'down' : 'up');
      }
    }

    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      handleCommand('select');
    }

    setTouchStart(null);
  };

  return (
    <BaseCard
      name={mode === 'touchpad' ? 'Media Control (Touchpad)' : 'Media Control (Circlepad)'}
      isActive={true}
      gradient={gradient}
      height="auto"
      disabled={pending}
      loading={pending}
    >
      <div className="space-y-4 p-2">
        {/* Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => onModeChange?.('touchpad')}
            disabled={pending}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: mode === 'touchpad' ? activeGradient.background : 'rgba(0,0,0,.7)',
              border: mode === 'touchpad' ? '1px solid rgba(0,255,255,.35)' : '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              boxShadow: mode === 'touchpad' ? '0 0 18px rgba(0,255,255,.55)' : 'none',
            }}
          >
            🖐️ Touchpad
          </button>
          <button
            onClick={() => onModeChange?.('circlepad')}
            disabled={pending}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: mode === 'circlepad' ? activeGradient.background : 'rgba(0,0,0,.7)',
              border: mode === 'circlepad' ? '1px solid rgba(139,0,255,.35)' : '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              boxShadow: mode === 'circlepad' ? '0 0 18px rgba(139,0,255,.45)' : 'none',
            }}
          >
            ⭕ Circlepad
          </button>
        </div>

        {/* Volume Controls Section (Collapsible) */}
        {mediaPlayer && onVolumeSet && (
          <div>
            <button
              onClick={() => setShowVolumeControls(!showVolumeControls)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all mb-2"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
              }}
            >
              <span>🔊 Volume Control</span>
              <span>{showVolumeControls ? '▲' : '▼'}</span>
            </button>

            {showVolumeControls && (
              <div className="space-y-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                {/* Volume Bar */}
                <div className="space-y-2">
                  <div className="text-center" style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>
                    {isMuted ? '🔇' : '🔊'} {percentage}%
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: isMuted ? 'rgba(244, 67, 54, 0.15)' : 'rgba(33, 150, 243, 0.15)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: isMuted ? '#F44336' : '#2196F3',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease, background 0.3s ease',
                        boxShadow: isMuted ? '0 0 8px #F44336' : '0 0 8px #2196F3',
                      }}
                    />
                  </div>
                </div>

                {/* Volume Presets */}
                <div className="flex gap-1">
                  {[
                    { level: 0.15, label: '😴', name: 'Sleep' },
                    { level: 0.2, label: '💬', name: 'Chat' },
                    { level: 0.4, label: '🎵', name: 'Music' },
                    { level: 0.7, label: '👥', name: 'Party' },
                    { level: 0.9, label: '🎉', name: 'Max' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      disabled={pending}
                      onClick={() => handleVolumePreset(preset.level)}
                      className="flex-1 px-1 py-1 rounded text-xs font-semibold transition-all"
                      style={{
                        background: Math.abs(volume - preset.level) < 0.05
                          ? 'rgba(33, 150, 243, 0.4)'
                          : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        fontSize: '10px',
                      }}
                      title={`${preset.name} (${Math.round(preset.level * 100)}%)`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Volume Controls */}
                <div className="flex gap-2">
                  <button
                    disabled={pending}
                    onClick={() => handleVolumeAdjust(-0.05)}
                    className="flex-1 px-2 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: 'rgba(33, 150, 243, 0.2)',
                      border: '1px solid rgba(33, 150, 243, 0.5)',
                      color: '#2196F3',
                    }}
                  >
                    🔉 −
                  </button>
                  <button
                    disabled={pending}
                    onClick={handleMuteToggle}
                    className="flex-1 px-2 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: isMuted ? 'rgba(244, 67, 54, 0.3)' : 'rgba(96, 125, 139, 0.2)',
                      border: isMuted ? '1px solid rgba(244, 67, 54, 0.7)' : '1px solid rgba(96, 125, 139, 0.5)',
                      color: isMuted ? '#F44336' : 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => handleVolumeAdjust(0.05)}
                    className="flex-1 px-2 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: 'rgba(33, 150, 243, 0.2)',
                      border: '1px solid rgba(33, 150, 243, 0.5)',
                      color: '#2196F3',
                    }}
                  >
                    🔊 +
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Touchpad Area */}
        {mode === 'touchpad' && (
          <div
            onTouchStart={handleTouchPadStart}
            onTouchEnd={handleTouchPadEnd}
            onMouseDown={handleTouchPadStart}
            onMouseUp={handleTouchPadEnd}
            className="relative rounded-2xl cursor-pointer select-none"
            style={{
              height: '280px',
              background: 'linear-gradient(135deg, rgba(0,50,100,0.3), rgba(0,100,150,0.2))',
              border: '2px solid rgba(0,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="text-center text-sm opacity-60" style={{ color: '#00ffff' }}>
              Swipe to navigate
              <br />
              Tap to select
            </div>
          </div>
        )}

        {/* Circlepad D-Pad */}
        {mode === 'circlepad' && (
          <div className="flex justify-center">
            <div className="relative" style={{ width: '220px', height: '220px' }}>
              {/* Center button */}
              <button
                disabled={pending}
                onClick={() => handleCommand('select')}
                className="absolute rounded-full"
                style={{
                  width: '80px',
                  height: '80px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'linear-gradient(135deg, rgba(139,0,255,0.5), rgba(255,0,255,0.3))',
                  border: '2px solid rgba(139,0,255,0.6)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                SELECT
              </button>

              {/* Up */}
              <button
                disabled={pending}
                onClick={() => handleCommand('up')}
                className="absolute"
                style={{
                  width: '70px',
                  height: '70px',
                  top: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderRadius: '50% 50% 0 0',
                  background: 'rgba(139,0,255,0.3)',
                  border: '2px solid rgba(139,0,255,0.4)',
                  color: 'white',
                  fontSize: '20px',
                }}
              >
                ▲
              </button>

              {/* Down */}
              <button
                disabled={pending}
                onClick={() => handleCommand('down')}
                className="absolute"
                style={{
                  width: '70px',
                  height: '70px',
                  bottom: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderRadius: '0 0 50% 50%',
                  background: 'rgba(139,0,255,0.3)',
                  border: '2px solid rgba(139,0,255,0.4)',
                  color: 'white',
                  fontSize: '20px',
                }}
              >
                ▼
              </button>

              {/* Left */}
              <button
                disabled={pending}
                onClick={() => handleCommand('left')}
                className="absolute"
                style={{
                  width: '70px',
                  height: '70px',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderRadius: '50% 0 0 50%',
                  background: 'rgba(139,0,255,0.3)',
                  border: '2px solid rgba(139,0,255,0.4)',
                  color: 'white',
                  fontSize: '20px',
                }}
              >
                ◀
              </button>

              {/* Right */}
              <button
                disabled={pending}
                onClick={() => handleCommand('right')}
                className="absolute"
                style={{
                  width: '70px',
                  height: '70px',
                  right: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderRadius: '0 50% 50% 0',
                  background: 'rgba(139,0,255,0.3)',
                  border: '2px solid rgba(139,0,255,0.4)',
                  color: 'white',
                  fontSize: '20px',
                }}
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* Media Controls Row */}
        <div className="grid grid-cols-4 gap-2">
          <button
            disabled={pending}
            onClick={() => handleCommand('skip_backward')}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
            }}
          >
            ⏮️
          </button>
          <button
            disabled={pending}
            onClick={() => handleCommand('play_pause')}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
            }}
          >
            ⏯️
          </button>
          <button
            disabled={pending}
            onClick={() => handleCommand('skip_forward')}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
            }}
          >
            ⏭️
          </button>
          <button
            disabled={pending}
            onClick={() => handleCommand('menu')}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: 'white',
            }}
          >
            ☰
          </button>
        </div>

        {/* App Shortcuts */}
        <div className="grid grid-cols-4 gap-2">
          <button
            disabled={pending}
            onClick={() => handleCommand('youtube')}
            className="px-2 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: '#FF0000',
              color: 'white',
              border: 'none',
            }}
          >
            📺 YT
          </button>
          <button
            disabled={pending}
            onClick={() => handleCommand('netflix')}
            className="px-2 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: '#E50914',
              color: 'white',
              border: 'none',
            }}
          >
            🎬 NF
          </button>
          <button
            disabled={pending}
            onClick={() => handleCommand('spotify')}
            className="px-2 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: '#1DB954',
              color: 'white',
              border: 'none',
            }}
          >
            🎵 SP
          </button>
          <button
            disabled={pending}
            onClick={() => handleCommand('home')}
            className="px-2 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
            }}
          >
            🏠
          </button>
        </div>

        {/* Custom Actions (Hue Sync Box) */}
        {customActions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold opacity-70" style={{ color: 'white' }}>
              Hue Sync Box
            </div>
            <div className="grid grid-cols-3 gap-2">
              {customActions.map((action) => (
                <button
                  key={action.id}
                  disabled={pending}
                  onClick={() => handleServiceCall(action)}
                  className="px-2 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: 'rgba(139,0,255,0.2)',
                    border: '1px solid rgba(139,0,255,0.4)',
                    color: 'white',
                  }}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseCard>
  );
}
