import { describe, it, expect } from 'vitest';
import {
  clampValue,
  validateBrightness,
  validateColorTemp,
  validateRGB,
  validateHS,
  validateXY,
  validateTemperature,
  validateTemperatureRange,
  validateVolume,
  validateTransition,
  validateHvacMode,
  validateEffect,
  hexToRGB,
  validateEntityId,
} from '../validation';

describe('Home Assistant Validation', () => {
  describe('clampValue', () => {
    it('should clamp values within bounds', () => {
      expect(clampValue(50, 0, 100)).toBe(50);
      expect(clampValue(-10, 0, 100)).toBe(0);
      expect(clampValue(150, 0, 100)).toBe(100);
      expect(clampValue(5.5, 1, 10)).toBe(5.5);
    });
  });

  describe('validateBrightness', () => {
    it('should validate brightness percentage', () => {
      expect(validateBrightness(50)).toBe(50);
      expect(validateBrightness(0)).toBe(0);
      expect(validateBrightness(100)).toBe(100);
      expect(validateBrightness(150)).toBe(100);
      expect(validateBrightness(-10)).toBe(0);
      expect(validateBrightness(50.7)).toBe(51); // Rounds
    });

    it('should throw on invalid input', () => {
      expect(() => validateBrightness(NaN)).toThrow('Brightness must be a valid number');
      expect(() => validateBrightness(null as any)).toThrow();
      expect(() => validateBrightness(undefined as any)).toThrow();
    });
  });

  describe('validateColorTemp', () => {
    it('should validate color temperature in mireds', () => {
      expect(validateColorTemp(300)).toBe(300);
      expect(validateColorTemp(100)).toBe(153); // Below min
      expect(validateColorTemp(600)).toBe(500); // Above max
      expect(validateColorTemp(300.7)).toBe(301); // Rounds
    });

    it('should respect custom min/max', () => {
      expect(validateColorTemp(200, 180, 400)).toBe(200);
      expect(validateColorTemp(150, 180, 400)).toBe(180);
      expect(validateColorTemp(450, 180, 400)).toBe(400);
    });

    it('should throw on invalid input', () => {
      expect(() => validateColorTemp(NaN)).toThrow('Color temperature must be a valid number');
    });
  });

  describe('validateRGB', () => {
    it('should validate RGB values', () => {
      expect(validateRGB(255, 128, 0)).toEqual([255, 128, 0]);
      expect(validateRGB(0, 0, 0)).toEqual([0, 0, 0]);
      expect(validateRGB(300, 128, -10)).toEqual([255, 128, 0]);
      expect(validateRGB(128.7, 64.3, 255.9)).toEqual([129, 64, 256]); // Rounds then clamps
    });

    it('should throw on invalid input', () => {
      expect(() => validateRGB(NaN, 0, 0)).toThrow('RGB values cannot be NaN');
      expect(() => validateRGB('255' as any, 0, 0)).toThrow('RGB values must be valid numbers');
    });
  });

  describe('validateHS', () => {
    it('should validate HS color values', () => {
      expect(validateHS(180, 50)).toEqual([180, 50]);
      expect(validateHS(0, 0)).toEqual([0, 0]);
      expect(validateHS(360, 100)).toEqual([360, 100]);
      expect(validateHS(400, 150)).toEqual([360, 100]); // Clamps
      expect(validateHS(-10, -20)).toEqual([0, 0]);
    });

    it('should throw on invalid input', () => {
      expect(() => validateHS(NaN, 50)).toThrow('HS values cannot be NaN');
      expect(() => validateHS('180' as any, 50)).toThrow('HS values must be valid numbers');
    });
  });

  describe('validateXY', () => {
    it('should validate XY color values', () => {
      expect(validateXY(0.5, 0.5)).toEqual([0.5, 0.5]);
      expect(validateXY(0, 0)).toEqual([0, 0]);
      expect(validateXY(1, 1)).toEqual([1, 1]);
      expect(validateXY(1.5, -0.5)).toEqual([1, 0]); // Clamps
    });

    it('should throw on invalid input', () => {
      expect(() => validateXY(NaN, 0.5)).toThrow('XY values cannot be NaN');
      expect(() => validateXY('0.5' as any, 0.5)).toThrow('XY values must be valid numbers');
    });
  });

  describe('validateTemperature', () => {
    it('should validate temperature in Celsius', () => {
      expect(validateTemperature(20)).toBe(20);
      expect(validateTemperature(20.3)).toBe(20.5); // Rounds to 0.5
      expect(validateTemperature(20.7)).toBe(20.5);
      expect(validateTemperature(20.8)).toBe(21);
      expect(validateTemperature(5)).toBe(10); // Below min
      expect(validateTemperature(40)).toBe(35); // Above max
    });

    it('should validate temperature in Fahrenheit', () => {
      expect(validateTemperature(70, undefined, undefined, 'fahrenheit')).toBe(70);
      expect(validateTemperature(40, undefined, undefined, 'fahrenheit')).toBe(50); // Below min
      expect(validateTemperature(100, undefined, undefined, 'fahrenheit')).toBe(95); // Above max
    });

    it('should respect custom ranges', () => {
      expect(validateTemperature(25, 15, 30)).toBe(25);
      expect(validateTemperature(10, 15, 30)).toBe(15);
      expect(validateTemperature(35, 15, 30)).toBe(30);
    });

    it('should throw on invalid input', () => {
      expect(() => validateTemperature(NaN)).toThrow('Temperature must be a valid number');
    });
  });

  describe('validateTemperatureRange', () => {
    it('should validate temperature range', () => {
      expect(validateTemperatureRange(18, 24)).toEqual([18, 24]);
      expect(validateTemperatureRange(20, 20)).toEqual([20, 21]); // Min difference
      expect(validateTemperatureRange(24, 18)).toEqual([24, 25]); // Low > high
    });

    it('should handle Fahrenheit', () => {
      expect(validateTemperatureRange(68, 75, undefined, undefined, 'fahrenheit')).toEqual([68, 75]);
      expect(validateTemperatureRange(70, 70, undefined, undefined, 'fahrenheit')).toEqual([70, 72]); // Min diff
    });
  });

  describe('validateVolume', () => {
    it('should validate volume level', () => {
      expect(validateVolume(0.5)).toBe(0.5);
      expect(validateVolume(0)).toBe(0);
      expect(validateVolume(1)).toBe(1);
      expect(validateVolume(1.5)).toBe(1); // Clamps
      expect(validateVolume(-0.5)).toBe(0);
    });

    it('should throw on invalid input', () => {
      expect(() => validateVolume(NaN)).toThrow('Volume must be a valid number');
    });
  });

  describe('validateTransition', () => {
    it('should validate transition time', () => {
      expect(validateTransition(5)).toBe(5);
      expect(validateTransition(0)).toBe(0);
      expect(validateTransition(300)).toBe(300);
      expect(validateTransition(400)).toBe(300); // Clamps
      expect(validateTransition(-10)).toBe(0);
    });

    it('should throw on invalid input', () => {
      expect(() => validateTransition(NaN)).toThrow('Transition time must be a valid number');
    });
  });

  describe('validateHvacMode', () => {
    const supportedModes = ['off', 'heat', 'cool', 'heat_cool', 'auto'];

    it('should validate HVAC mode', () => {
      expect(validateHvacMode('heat', supportedModes)).toBe('heat');
      expect(validateHvacMode('cool', supportedModes)).toBe('cool');
      expect(validateHvacMode('auto', supportedModes)).toBe('auto');
    });

    it('should throw on invalid mode', () => {
      expect(() => validateHvacMode('invalid', supportedModes)).toThrow(
        'HVAC mode "invalid" is not supported. Valid modes: off, heat, cool, heat_cool, auto'
      );
      expect(() => validateHvacMode('', supportedModes)).toThrow('HVAC mode must be a valid string');
      expect(() => validateHvacMode(null as any, supportedModes)).toThrow();
    });
  });

  describe('validateEffect', () => {
    const supportedEffects = ['rainbow', 'pulse', 'strobe', 'solid'];

    it('should validate effect', () => {
      expect(validateEffect('rainbow', supportedEffects)).toBe('rainbow');
      expect(validateEffect('pulse', supportedEffects)).toBe('pulse');
    });

    it('should throw on invalid effect', () => {
      expect(() => validateEffect('disco', supportedEffects)).toThrow(
        'Effect "disco" is not supported. Valid effects: rainbow, pulse, strobe, solid'
      );
      expect(() => validateEffect('', supportedEffects)).toThrow('Effect must be a valid string');
    });
  });

  describe('hexToRGB', () => {
    it('should convert hex to RGB', () => {
      expect(hexToRGB('#FF0000')).toEqual([255, 0, 0]);
      expect(hexToRGB('#00FF00')).toEqual([0, 255, 0]);
      expect(hexToRGB('#0000FF')).toEqual([0, 0, 255]);
      expect(hexToRGB('#808080')).toEqual([128, 128, 128]);
      expect(hexToRGB('FFFFFF')).toEqual([255, 255, 255]); // Without #
      expect(hexToRGB('#000000')).toEqual([0, 0, 0]);
    });

    it('should throw on invalid hex', () => {
      expect(() => hexToRGB('#FF00')).toThrow('Invalid hex color format');
      expect(() => hexToRGB('#GGGGGG')).toThrow('Invalid hex color format');
      expect(() => hexToRGB('red')).toThrow('Invalid hex color format');
      expect(() => hexToRGB('')).toThrow('Invalid hex color format');
    });
  });

  describe('validateEntityId', () => {
    it('should validate entity ID format', () => {
      expect(validateEntityId('light.living_room')).toBe('light.living_room');
      expect(validateEntityId('switch.kitchen_lights')).toBe('switch.kitchen_lights');
      expect(validateEntityId('climate.thermostat_1')).toBe('climate.thermostat_1');
    });

    it('should throw on invalid entity ID', () => {
      expect(() => validateEntityId('invalid')).toThrow('Invalid entity ID format');
      expect(() => validateEntityId('light')).toThrow('Invalid entity ID format');
      expect(() => validateEntityId('light.')).toThrow('Invalid entity ID format');
      expect(() => validateEntityId('Light.Room')).toThrow('Invalid entity ID format'); // Uppercase
      expect(() => validateEntityId('light.living-room')).toThrow('Invalid entity ID format'); // Hyphen
      expect(() => validateEntityId('')).toThrow('Entity ID must be a valid string');
      expect(() => validateEntityId(null as any)).toThrow();
    });
  });
});