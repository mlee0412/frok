'use client';

import React, { useState, useEffect } from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';
import { ThermostatDial } from '../smart-home/ThermostatDial';

export interface ClimateEntity {
  id: string;
  name: string;
  state: string;
  type: 'climate';
  attrs?: {
    temperature?: number;
    target_temp?: number;
    target_temperature?: number;
    current_temperature?: number;
    hvac_mode?: string;
    hvac_action?: string;
    hvac_modes?: string[];
    min_temp?: number;
    max_temp?: number;
  };
}

export interface ClimateCardEnhancedProps {
  entity: ClimateEntity;
  height?: string;
  onSetTemp?: (entityId: string, temperature: number) => Promise<void>;
  onSetMode?: (entityId: string, mode: string) => Promise<void>;
}

type TempUnit = 'C' | 'F';

// Temperature conversion utilities with proper rounding
const celsiusToFahrenheit = (celsius: number): number => {
  return Math.round((celsius * 9) / 5 + 32);
};

const fahrenheitToCelsius = (fahrenheit: number): number => {
  return Math.round(((fahrenheit - 32) * 5) / 9 * 10) / 10; // Round to 1 decimal for Celsius
};

export function ClimateCardEnhanced({
  entity,
  height = 'auto',
  onSetTemp,
  onSetMode,
}: ClimateCardEnhancedProps) {
  const [showThermostat, setShowThermostat] = useState(false);
  const [pending, setPending] = useState(false);
  const [tempUnit, setTempUnit] = useState<TempUnit>('C');

  // Load temperature unit preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('frok-temp-unit');
    if (saved === 'F' || saved === 'C') {
      setTempUnit(saved);
    }
  }, []);

  // Save temperature unit preference
  const toggleTempUnit = () => {
    const newUnit: TempUnit = tempUnit === 'C' ? 'F' : 'C';
    setTempUnit(newUnit);
    localStorage.setItem('frok-temp-unit', newUnit);
  };

  const attrs = entity.attrs || {};
  const currentTempC = attrs.current_temperature != null
    ? attrs.current_temperature
    : null;
  const targetTempC = attrs.target_temp || attrs.target_temperature || 22;
  const hvacMode = attrs.hvac_mode || entity.state;
  const hvacAction = attrs.hvac_action;
  const hvacModes = attrs.hvac_modes || ['off', 'heat', 'cool', 'auto'];
  const minTempC = attrs.min_temp || 16;
  const maxTempC = attrs.max_temp || 30;

  // Convert temperatures based on selected unit
  const currentTemp = currentTempC != null
    ? (tempUnit === 'F' ? celsiusToFahrenheit(currentTempC) : currentTempC)
    : null;
  const targetTemp = tempUnit === 'F' ? celsiusToFahrenheit(targetTempC) : targetTempC;
  const minTemp = tempUnit === 'F' ? celsiusToFahrenheit(minTempC) : minTempC;
  const maxTemp = tempUnit === 'F' ? celsiusToFahrenheit(maxTempC) : maxTempC;

  // Determine gradient based on hvac_action
  let gradient = gradients['blue-purple'];
  if (hvacAction === 'heating') {
    gradient = gradients['red-pink'];
  } else if (hvacAction === 'cooling') {
    gradient = gradients['cyan-blue'];
  } else if (hvacMode === 'off') {
    gradient = gradients['off-state'];
  }

  const label = hvacAction
    ? `${hvacAction.charAt(0).toUpperCase()}${hvacAction.slice(1)}`
    : hvacMode;

  const handleModeChange = async (mode: string) => {
    if (!onSetMode || pending) return;
    setPending(true);
    try {
      await onSetMode(entity.id, mode);
    } finally {
      setPending(false);
    }
  };

  const handleTempChange = async (temp: number) => {
    if (!onSetTemp || pending) return;
    setPending(true);
    try {
      // Convert back to Celsius if needed (HA uses Celsius)
      const tempInCelsius = tempUnit === 'F' ? fahrenheitToCelsius(temp) : temp;
      await onSetTemp(entity.id, tempInCelsius);
    } finally {
      setPending(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'off': return '⏸️';
      case 'heat': return '🔥';
      case 'cool': return '❄️';
      case 'auto': return '🔄';
      case 'dry': return '💨';
      case 'fan_only': return '🌀';
      default: return '⚙️';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'off': return 'rgba(150,150,150,0.3)';
      case 'heat': return 'rgba(255,100,100,0.3)';
      case 'cool': return 'rgba(100,200,255,0.3)';
      case 'auto': return 'rgba(100,255,150,0.3)';
      default: return 'rgba(200,200,200,0.3)';
    }
  };

  return (
    <>
      <BaseCard
        name={entity.name}
        icon="🌡️"
        isActive={hvacMode !== 'off'}
        gradient={gradient}
        height={height}
        disabled={pending}
      >
        <div className="flex flex-col h-full gap-3 p-2">
          {/* Temperature Display with Unit Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {currentTemp != null && (
                <div
                  style={{
                    fontSize: '52px',
                    fontWeight: 300,
                    color: gradient.textColor,
                    textShadow: `0 0 20px ${gradient.iconColor}`,
                    lineHeight: 1,
                  }}
                >
                  {Math.round(currentTemp)}°{tempUnit}
                </div>
              )}
              {targetTemp != null && (
                <div
                  style={{
                    fontSize: '14px',
                    color: gradient.textColor,
                    opacity: 0.7,
                    marginTop: '4px',
                  }}
                >
                  Target: {Math.round(targetTemp)}°{tempUnit}
                </div>
              )}
            </div>

            {/* Unit Toggle Button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={toggleTempUnit}
                className="px-3 py-2 rounded-lg transition-all text-xs font-bold"
                style={{
                  background: 'rgba(34,211,238,0.15)',
                  border: '1px solid rgba(34,211,238,0.3)',
                  color: '#22d3ee',
                }}
                title={`Switch to ${tempUnit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
              >
                °{tempUnit}
              </button>

              {/* Dial Button */}
              {onSetTemp && (
                <button
                  onClick={() => setShowThermostat(true)}
                  disabled={pending}
                  className="p-3 rounded-lg transition-all"
                  style={{
                    background: 'rgba(34,211,238,0.2)',
                    border: '1px solid rgba(34,211,238,0.4)',
                    color: '#22d3ee',
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Mode/Action Status */}
          <div
            style={{
              fontSize: '13px',
              color: gradient.textColor,
              opacity: 0.8,
              textTransform: 'capitalize',
              padding: '4px 8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              display: 'inline-block',
            }}
          >
            {label}
          </div>

          {/* HVAC Mode Selector */}
          {onSetMode && hvacModes.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-auto">
              {hvacModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  disabled={pending}
                  className="flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: hvacMode === mode ? getModeColor(mode) : 'rgba(0,0,0,0.3)',
                    border: hvacMode === mode ? `1px solid ${getModeColor(mode).replace('0.3', '0.8')}` : '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                  }}
                >
                  <span className="text-base mb-1">{getModeIcon(mode)}</span>
                  <span className="text-[10px] capitalize">{mode.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </BaseCard>

      {/* Thermostat Dial Modal */}
      {showThermostat && onSetTemp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-xl border border-primary bg-background p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-between w-full">
                <h3 className="text-xl font-semibold text-foreground">Set Temperature</h3>
                <button
                  onClick={toggleTempUnit}
                  className="px-3 py-1.5 rounded-lg transition-all text-sm font-bold"
                  style={{
                    background: 'rgba(34,211,238,0.15)',
                    border: '1px solid rgba(34,211,238,0.3)',
                    color: '#22d3ee',
                  }}
                  title={`Switch to ${tempUnit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
                >
                  °{tempUnit === 'C' ? 'F' : 'C'}
                </button>
              </div>
              <ThermostatDial
                size={260}
                value={targetTemp}
                min={minTemp}
                max={maxTemp}
                step={tempUnit === 'F' ? 1 : 0.5}
                unit={`°${tempUnit}`}
                onChange={handleTempChange}
              />
              <button
                className="w-full px-6 py-3 rounded-lg border border-primary bg-primary/10 hover:bg-primary/20 transition-colors text-primary font-medium"
                onClick={() => setShowThermostat(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
