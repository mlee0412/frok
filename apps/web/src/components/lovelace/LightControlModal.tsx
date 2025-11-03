'use client';

import React, { useState } from 'react';
import type { LightEntity } from './LightCard';

export interface LightControlModalProps {
  entity: LightEntity;
  isOpen: boolean;
  onClose: () => void;
  onBrightnessChange?: (entityId: string, brightness: number) => Promise<void>;
  onColorTempChange?: (entityId: string, colorTemp: number) => Promise<void>;
}

export function LightControlModal({
  entity,
  isOpen,
  onClose,
  onBrightnessChange,
  onColorTempChange,
}: LightControlModalProps) {
  const [pending, setPending] = useState(false);
  const attrs = entity.attrs || {};

  const currentBrightness = attrs.brightness_pct ?? (attrs.brightness ? (attrs.brightness / 255) * 100 : 100);
  const currentColorTemp = attrs.color_temp_kelvin ?? 4000;

  const handleBrightnessChange = async (value: number) => {
    if (!onBrightnessChange || pending) return;
    setPending(true);
    try {
      await onBrightnessChange(entity.id, value);
    } finally {
      setPending(false);
    }
  };

  const handleColorTempChange = async (value: number) => {
    if (!onColorTempChange || pending) return;
    setPending(true);
    try {
      await onColorTempChange(entity.id, value);
    } finally {
      setPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,30,0.95), rgba(30,30,40,0.95))',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              💡 {entity.name}
            </h2>
            <p className="text-sm text-foreground/60 mt-1">Advanced Controls</p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Brightness Control */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">
              Brightness: {Math.round(currentBrightness)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={currentBrightness}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              disabled={pending}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${currentBrightness}%, rgba(255,255,255,0.1) ${currentBrightness}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <div className="flex justify-between mt-2">
              {[0, 25, 50, 75, 100].map((val) => (
                <button
                  key={val}
                  onClick={() => handleBrightnessChange(val)}
                  disabled={pending}
                  className="text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors text-white"
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          {/* Color Temperature Control */}
          {attrs.color_temp_kelvin != null && onColorTempChange && (
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">
                Color Temperature: {currentColorTemp}K
              </label>
              <input
                type="range"
                min="2000"
                max="6500"
                step="100"
                value={currentColorTemp}
                onChange={(e) => handleColorTempChange(Number(e.target.value))}
                disabled={pending}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-xs text-foreground/60">
                <span>Warm (2000K)</span>
                <span>Cool (6500K)</span>
              </div>
              <div className="flex justify-between mt-2">
                {[2700, 3500, 4500, 6000].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleColorTempChange(val)}
                    disabled={pending}
                    className="text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors text-white"
                  >
                    {val}K
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RGB Color Info */}
          {attrs.rgb_color && (
            <div className="text-sm text-foreground/60">
              <span className="font-semibold">RGB:</span> {attrs.rgb_color.join(', ')}
            </div>
          )}

          {/* Effect Info */}
          {attrs.effect && (
            <div className="text-sm text-foreground/60">
              <span className="font-semibold">Effect:</span> {attrs.effect}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(139,0,255,0.3), rgba(255,0,255,0.2))',
            border: '1px solid rgba(139,0,255,0.5)',
            color: 'white',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
