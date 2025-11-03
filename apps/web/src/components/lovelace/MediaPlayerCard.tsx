'use client';

import React, { useState } from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';

export interface MediaPlayerEntity {
  id: string;
  name: string;
  state: 'playing' | 'paused' | 'idle' | 'off' | string;
  type: 'media_player';
  attrs?: {
    volume_level?: number;
    is_volume_muted?: boolean;
    media_title?: string;
    media_artist?: string;
    media_album_name?: string;
  };
}

export interface MediaPlayerCardProps {
  entity: MediaPlayerEntity;
  height?: string;
  onVolumeSet?: (entityId: string, volume: number) => Promise<void>;
  onVolumeMute?: (entityId: string, muted: boolean) => Promise<void>;
  onPlayPause?: (entityId: string) => Promise<void>;
  onNext?: (entityId: string) => Promise<void>;
  onPrevious?: (entityId: string) => Promise<void>;
}

export function MediaPlayerCard({
  entity,
  height = '200px',
  onVolumeSet,
  onVolumeMute,
  onPlayPause,
  onNext,
  onPrevious,
}: MediaPlayerCardProps) {
  const [pending, setPending] = useState(false);
  const attrs = entity.attrs || {};
  const volume = attrs.volume_level != null ? attrs.volume_level : 0.5;
  const isMuted = attrs.is_volume_muted || false;
  const isPlaying = entity.state === 'playing';

  const gradient = isPlaying ? gradients['pink-orange'] : gradients['dark-red'];

  const handleVolumePreset = async (level: number) => {
    if (!onVolumeSet || pending) return;
    setPending(true);
    try {
      await onVolumeSet(entity.id, level);
    } finally {
      setPending(false);
    }
  };

  const handleVolumeAdjust = async (delta: number) => {
    if (!onVolumeSet || pending) return;
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setPending(true);
    try {
      await onVolumeSet(entity.id, newVolume);
    } finally {
      setPending(false);
    }
  };

  const handleMuteToggle = async () => {
    if (!onVolumeMute || pending) return;
    setPending(true);
    try {
      await onVolumeMute(entity.id, !isMuted);
    } finally {
      setPending(false);
    }
  };

  const handlePlayPause = async () => {
    if (!onPlayPause || pending) return;
    setPending(true);
    try {
      await onPlayPause(entity.id);
    } finally {
      setPending(false);
    }
  };

  const handleNext = async () => {
    if (!onNext || pending) return;
    setPending(true);
    try {
      await onNext(entity.id);
    } finally {
      setPending(false);
    }
  };

  const handlePrevious = async () => {
    if (!onPrevious || pending) return;
    setPending(true);
    try {
      await onPrevious(entity.id);
    } finally {
      setPending(false);
    }
  };

  const percentage = Math.round(volume * 100);
  const volumeIcon = isMuted ? '🔇' : '🔊';
  const barColor = isMuted ? '#F44336' : '#2196F3';
  const bgColor = isMuted ? 'rgba(244, 67, 54, 0.15)' : 'rgba(33, 150, 243, 0.15)';

  return (
    <BaseCard
      name={entity.name}
      isActive={isPlaying}
      gradient={gradient}
      height={height}
      disabled={pending}
      loading={pending}
    >
      <div className="space-y-3">
        {/* Volume Bar */}
        <div className="space-y-2">
          <div className="text-center" style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>
            {volumeIcon} {percentage}%
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: bgColor,
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: barColor,
                borderRadius: '4px',
                transition: 'width 0.3s ease, background 0.3s ease',
                boxShadow: `0 0 8px ${barColor}`,
              }}
            />
          </div>
        </div>

        {/* Volume Presets */}
        <div className="flex gap-1">
          <button
            disabled={pending}
            onClick={() => handleVolumePreset(0.15)}
            className="flex-1 px-2 py-1 rounded text-xs font-semibold transition-all"
            style={{
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            😴 Sleep
          </button>
          <button
            disabled={pending}
            onClick={() => handleVolumePreset(0.2)}
            className="flex-1 px-2 py-1 rounded text-xs font-semibold transition-all"
            style={{
              background: '#00BCD4',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            💬 Chat
          </button>
          <button
            disabled={pending}
            onClick={() => handleVolumePreset(0.4)}
            className="flex-1 px-2 py-1 rounded text-xs font-semibold transition-all"
            style={{
              background: '#FF7043',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            🎵 Music
          </button>
          <button
            disabled={pending}
            onClick={() => handleVolumePreset(0.7)}
            className="flex-1 px-2 py-1 rounded text-xs font-semibold transition-all"
            style={{
              background: '#00C853',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            👥 Party
          </button>
          <button
            disabled={pending}
            onClick={() => handleVolumePreset(0.9)}
            className="flex-1 px-2 py-1 rounded text-xs font-semibold transition-all"
            style={{
              background: '#FF1744',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            🎉 Max
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => handleVolumeAdjust(-0.05)}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
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
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: isMuted ? 'rgba(244, 67, 54, 0.3)' : 'rgba(96, 125, 139, 0.2)',
              border: isMuted ? '1px solid rgba(244, 67, 54, 0.7)' : '1px solid rgba(96, 125, 139, 0.5)',
              color: isMuted ? '#F44336' : 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {isMuted ? '🔇' : '🔊'} Mute
          </button>
          <button
            disabled={pending}
            onClick={() => handleVolumeAdjust(0.05)}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: 'rgba(33, 150, 243, 0.2)',
              border: '1px solid rgba(33, 150, 243, 0.5)',
              color: '#2196F3',
            }}
          >
            🔊 +
          </button>
        </div>

        {/* Media Controls */}
        {(onPlayPause || onNext || onPrevious) && (
          <div className="flex gap-2">
            {onPrevious && (
              <button
                disabled={pending}
                onClick={handlePrevious}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                }}
              >
                ⏮️ Prev
              </button>
            )}
            {onPlayPause && (
              <button
                disabled={pending}
                onClick={handlePlayPause}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                }}
              >
                {isPlaying ? '⏸️' : '▶️'} {isPlaying ? 'Pause' : 'Play'}
              </button>
            )}
            {onNext && (
              <button
                disabled={pending}
                onClick={handleNext}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                }}
              >
                ⏭️ Next
              </button>
            )}
          </div>
        )}

        {/* Now Playing */}
        {attrs.media_title && (
          <div className="text-center text-xs opacity-70" style={{ color: 'white' }}>
            {attrs.media_title}
            {attrs.media_artist && ` • ${attrs.media_artist}`}
          </div>
        )}
      </div>
    </BaseCard>
  );
}
