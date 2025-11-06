'use client';
import React, { useState, useEffect } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebounce';

interface DebouncedSliderProps {
  value: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  showValue?: boolean;
  debounceMs?: number;
  ariaLabel?: string;
}

/**
 * Slider component with debounced onChange callback
 * Shows immediate visual feedback but delays the actual onChange call
 */
export function DebouncedSlider({
  value,
  onChange,
  onChangeEnd,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className = '',
  label,
  showValue = true,
  debounceMs = 300,
  ariaLabel,
}: DebouncedSliderProps) {
  // Local state for immediate visual feedback
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when prop changes from external source
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange callback
  const debouncedOnChange = useDebouncedCallback(
    (newValue: number) => {
      onChange(newValue);
    },
    debounceMs
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setLocalValue(newValue); // Immediate visual feedback
    debouncedOnChange(newValue); // Debounced actual change
  };

  const handleMouseUp = () => {
    if (onChangeEnd) {
      onChangeEnd(localValue);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (onChangeEnd) {
        onChangeEnd(localValue);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {label && (
        <label htmlFor={`slider-${label}`} className="text-xs text-foreground/70">
          {label}
        </label>
      )}
      <input
        id={label ? `slider-${label}` : undefined}
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        onKeyUp={handleKeyUp}
        disabled={disabled}
        className={`flex-1 ${className}`}
        aria-label={ariaLabel || label || 'Slider control'}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localValue}
        aria-disabled={disabled}
      />
      {showValue && (
        <span className="text-xs text-foreground/70 min-w-[3ch] text-center">
          {localValue}
        </span>
      )}
    </div>
  );
}

interface DebouncedNumberInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  onChangeEnd?: (value: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  ariaLabel?: string;
}

/**
 * Number input component with debounced onChange callback
 */
export function DebouncedNumberInput({
  value,
  onChange,
  onChangeEnd,
  min,
  max,
  step,
  disabled = false,
  placeholder,
  className = '',
  debounceMs = 500,
  ariaLabel,
}: DebouncedNumberInputProps) {
  const [localValue, setLocalValue] = useState<number | ''>(value);

  // Sync local value when prop changes from external source
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange callback
  const debouncedOnChange = useDebouncedCallback(
    (newValue: number | '') => {
      onChange(newValue);
    },
    debounceMs
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const newValue = rawValue === '' ? '' : Number(rawValue);
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleBlur = () => {
    if (onChangeEnd) {
      onChangeEnd(localValue);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onChangeEnd) {
        onChangeEnd(localValue);
      }
    }
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyUp={handleKeyUp}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel || placeholder || 'Number input'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={typeof localValue === 'number' ? localValue : undefined}
      aria-disabled={disabled}
    />
  );
}