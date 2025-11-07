'use client';

import React, { useState } from 'react';
import type { LightEntity } from './LightCard';

export interface LightControlModalProps {
  entity: LightEntity;
  isOpen: boolean;
  onClose: () => void;
  onBrightnessChange?: (entityId: string, brightness: number) => Promise<void>;
  onColorTempChange?: (entityId: string, colorTemp: number) => Promise<void>;
  onEffectChange?: (entityId: string, effect: string) => Promise<void>;
  onHSColorChange?: (entityId: string, h: number, s: number) => Promise<void>;
  onRGBColorChange?: (entityId: string, r: number, g: number, b: number) => Promise<void>;
}

// Color conversion utilities
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s = s / 100;
  l = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export function LightControlModal({
  entity,
  isOpen,
  onClose,
  onBrightnessChange,
  onColorTempChange,
  onEffectChange,
  onHSColorChange,
  onRGBColorChange,
}: LightControlModalProps) {
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'color' | 'effects'>('basic');
  const attrs = entity.attrs || {};

  const currentBrightness = attrs.brightness_pct ?? (attrs.brightness ? (attrs.brightness / 255) * 100 : 100);
  const currentColorTemp = attrs.color_temp_kelvin ?? 4000;
  const currentEffect = attrs.effect ?? 'None';
  const effectList = attrs.effect_list ?? [];
  const supportedColorModes = attrs.supported_color_modes ?? [];

  // Color state
  const [hue, setHue] = useState(attrs.hs_color?.[0] ?? 0);
  const [saturation, setSaturation] = useState(attrs.hs_color?.[1] ?? 100);
  const [rgb, setRgb] = useState<[number, number, number]>(
    attrs.rgb_color ?? [255, 255, 255]
  );

  const supportsColorTemp = supportedColorModes.includes('color_temp') || attrs.color_temp_kelvin != null;
  const supportsHSColor = supportedColorModes.includes('hs') || supportedColorModes.includes('rgb');
  const supportsEffects = effectList.length > 0;

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

  const handleEffectChange = async (effect: string) => {
    if (!onEffectChange || pending) return;
    setPending(true);
    try {
      await onEffectChange(entity.id, effect);
    } finally {
      setPending(false);
    }
  };

  const handleHSColorChange = async () => {
    if (!onHSColorChange || pending) return;
    setPending(true);
    try {
      await onHSColorChange(entity.id, hue, saturation);
    } finally {
      setPending(false);
    }
  };

  const handleRGBColorChange = async () => {
    if (!onRGBColorChange || pending) return;
    setPending(true);
    try {
      await onRGBColorChange(entity.id, rgb[0], rgb[1], rgb[2]);
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
        className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'basic'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-surface/50 border-border text-foreground/70'
            }`}
            style={{ border: '1px solid' }}
          >
            Basic
          </button>
          {supportsHSColor && (
            <button
              onClick={() => setActiveTab('color')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'color'
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-surface/50 border-border text-foreground/70'
              }`}
              style={{ border: '1px solid' }}
            >
              Color
            </button>
          )}
          {supportsEffects && (
            <button
              onClick={() => setActiveTab('effects')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'effects'
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-surface/50 border-border text-foreground/70'
              }`}
              style={{ border: '1px solid' }}
            >
              Effects
            </button>
          )}
        </div>

        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* Brightness Control */}
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
                className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer"
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
                    className="text-xs px-2 py-1 rounded bg-surface/50 hover:bg-surface transition-colors text-white"
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Color Temperature Control */}
            {supportsColorTemp && onColorTempChange && (
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
                  className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer"
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
                      className="text-xs px-2 py-1 rounded bg-surface/50 hover:bg-surface transition-colors text-white"
                    >
                      {val}K
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Color Tab */}
        {activeTab === 'color' && supportsHSColor && (
          <div className="space-y-4">
            {/* HS Color Picker */}
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">
                Hue & Saturation
              </label>
              <div className="flex flex-col items-center gap-4">
                {/* Hue Slider */}
                <div className="w-full">
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Hue: {Math.round(hue)}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => setHue(Number(e.target.value))}
                    disabled={pending}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                    }}
                  />
                </div>

                {/* Saturation Slider */}
                <div className="w-full">
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Saturation: {Math.round(saturation)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    disabled={pending}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ffffff, ${rgbToHex(...hslToRgb(hue, 100, 50))})`,
                    }}
                  />
                </div>

                {/* Color Preview */}
                <div className="flex items-center gap-4 w-full">
                  <div
                    className="w-20 h-20 rounded-lg border-2 border-white/20"
                    style={{
                      backgroundColor: rgbToHex(...hslToRgb(hue, saturation, 50)),
                    }}
                  />
                  <button
                    onClick={handleHSColorChange}
                    disabled={pending}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34,211,238,0.3), rgba(14,165,233,0.2))',
                      border: '1px solid rgba(34,211,238,0.5)',
                      color: 'white',
                    }}
                  >
                    {pending ? 'Applying...' : 'Apply Color'}
                  </button>
                </div>
              </div>
            </div>

            {/* RGB Sliders */}
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">
                RGB Color
              </label>
              <div className="space-y-3">
                {/* Red Slider */}
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Red: {rgb[0]}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb[0]}
                    onChange={(e) => setRgb([Number(e.target.value), rgb[1], rgb[2]])}
                    disabled={pending}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #000000, #ff0000)`,
                    }}
                  />
                </div>

                {/* Green Slider */}
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Green: {rgb[1]}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb[1]}
                    onChange={(e) => setRgb([rgb[0], Number(e.target.value), rgb[2]])}
                    disabled={pending}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #000000, #00ff00)`,
                    }}
                  />
                </div>

                {/* Blue Slider */}
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Blue: {rgb[2]}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb[2]}
                    onChange={(e) => setRgb([rgb[0], rgb[1], Number(e.target.value)])}
                    disabled={pending}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #000000, #0000ff)`,
                    }}
                  />
                </div>

                {/* RGB Preview */}
                <div className="flex items-center gap-4 mt-3">
                  <div
                    className="w-20 h-20 rounded-lg border-2 border-white/20"
                    style={{
                      backgroundColor: rgbToHex(rgb[0], rgb[1], rgb[2]),
                    }}
                  />
                  <button
                    onClick={handleRGBColorChange}
                    disabled={pending}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(219,39,119,0.2))',
                      border: '1px solid rgba(236,72,153,0.5)',
                      color: 'white',
                    }}
                  >
                    {pending ? 'Applying...' : 'Apply RGB'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && supportsEffects && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">
                Effect: {currentEffect}
              </label>
              <select
                value={currentEffect}
                onChange={(e) => handleEffectChange(e.target.value)}
                disabled={pending}
                className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:border-primary focus:outline-none transition-colors"
              >
                <option value="None">None (Solid Color)</option>
                {effectList.map((effect) => (
                  <option key={effect} value={effect}>
                    {effect}
                  </option>
                ))}
              </select>
            </div>

            {/* Effect Preview Grid */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {['None', ...effectList.slice(0, 5)].map((effect) => (
                <button
                  key={effect}
                  onClick={() => handleEffectChange(effect)}
                  disabled={pending}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentEffect === effect
                      ? 'bg-primary/30 border-primary text-primary'
                      : 'bg-surface/50 border-border text-foreground/70 hover:bg-surface'
                  }`}
                  style={{ border: '1px solid' }}
                >
                  {effect}
                </button>
              ))}
            </div>
          </div>
        )}

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
