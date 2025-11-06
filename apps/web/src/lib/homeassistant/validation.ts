/**
 * Validation utilities for Home Assistant device controls
 */

/**
 * Validate and clamp a numeric value within bounds
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate brightness percentage (0-100)
 */
export function validateBrightness(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Brightness must be a valid number');
  }
  return clampValue(Math.round(value), 0, 100);
}

/**
 * Validate color temperature in mireds
 */
export function validateColorTemp(value: number, minMireds?: number, maxMireds?: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Color temperature must be a valid number');
  }

  const min = minMireds ?? 153; // ~6500K (cold)
  const max = maxMireds ?? 500; // ~2000K (warm)

  return clampValue(Math.round(value), min, max);
}

/**
 * Validate RGB color values (0-255 each)
 */
export function validateRGB(r: number, g: number, b: number): [number, number, number] {
  if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
    throw new Error('RGB values must be valid numbers');
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error('RGB values cannot be NaN');
  }

  return [
    clampValue(Math.round(r), 0, 255),
    clampValue(Math.round(g), 0, 255),
    clampValue(Math.round(b), 0, 255),
  ];
}

/**
 * Validate HS color values (H: 0-360, S: 0-100)
 */
export function validateHS(h: number, s: number): [number, number] {
  if (typeof h !== 'number' || typeof s !== 'number') {
    throw new Error('HS values must be valid numbers');
  }

  if (isNaN(h) || isNaN(s)) {
    throw new Error('HS values cannot be NaN');
  }

  return [
    clampValue(h, 0, 360),
    clampValue(s, 0, 100),
  ];
}

/**
 * Validate XY color values (0-1 each)
 */
export function validateXY(x: number, y: number): [number, number] {
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('XY values must be valid numbers');
  }

  if (isNaN(x) || isNaN(y)) {
    throw new Error('XY values cannot be NaN');
  }

  return [
    clampValue(x, 0, 1),
    clampValue(y, 0, 1),
  ];
}

/**
 * Validate temperature for climate control
 */
export function validateTemperature(
  value: number,
  minTemp?: number,
  maxTemp?: number,
  unit: 'celsius' | 'fahrenheit' = 'celsius'
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Temperature must be a valid number');
  }

  // Default ranges based on unit
  const defaults = unit === 'celsius'
    ? { min: 10, max: 35 }
    : { min: 50, max: 95 };

  const min = minTemp ?? defaults.min;
  const max = maxTemp ?? defaults.max;

  // Round to nearest 0.5
  const rounded = Math.round(value * 2) / 2;

  return clampValue(rounded, min, max);
}

/**
 * Validate temperature range for dual setpoint climate control
 */
export function validateTemperatureRange(
  low: number,
  high: number,
  minTemp?: number,
  maxTemp?: number,
  unit: 'celsius' | 'fahrenheit' = 'celsius'
): [number, number] {
  const validLow = validateTemperature(low, minTemp, maxTemp, unit);
  const validHigh = validateTemperature(high, minTemp, maxTemp, unit);

  // Ensure low is less than high with minimum 1 degree difference
  const minDiff = unit === 'celsius' ? 1 : 2;

  if (validLow >= validHigh) {
    return [validLow, validLow + minDiff];
  }

  return [validLow, validHigh];
}

/**
 * Validate volume level (0-1)
 */
export function validateVolume(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Volume must be a valid number');
  }

  return clampValue(value, 0, 1);
}

/**
 * Validate transition time in seconds (0-300)
 */
export function validateTransition(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Transition time must be a valid number');
  }

  return clampValue(value, 0, 300);
}

/**
 * Validate HVAC mode against supported modes
 */
export function validateHvacMode(mode: string, supportedModes: string[]): string {
  if (!mode || typeof mode !== 'string') {
    throw new Error('HVAC mode must be a valid string');
  }

  if (!supportedModes.includes(mode)) {
    throw new Error(`HVAC mode "${mode}" is not supported. Valid modes: ${supportedModes.join(', ')}`);
  }

  return mode;
}

/**
 * Validate effect name against supported effects
 */
export function validateEffect(effect: string, supportedEffects: string[]): string {
  if (!effect || typeof effect !== 'string') {
    throw new Error('Effect must be a valid string');
  }

  if (!supportedEffects.includes(effect)) {
    throw new Error(`Effect "${effect}" is not supported. Valid effects: ${supportedEffects.join(', ')}`);
  }

  return effect;
}

/**
 * Parse and validate hex color string to RGB
 */
export function hexToRGB(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error('Invalid hex color format. Expected format: #RRGGBB');
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return validateRGB(r, g, b);
}

/**
 * Validate entity ID format
 */
export function validateEntityId(entityId: string): string {
  if (!entityId || typeof entityId !== 'string') {
    throw new Error('Entity ID must be a valid string');
  }

  const pattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;

  if (!pattern.test(entityId)) {
    throw new Error('Invalid entity ID format. Expected format: domain.entity_name');
  }

  return entityId;
}