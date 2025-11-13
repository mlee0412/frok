'use client';

import { useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

// ============================================================================
// Constants
// ============================================================================

/**
 * Vibration patterns for different haptic feedback types
 * Pattern format: [vibrate, pause, vibrate, ...]
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 50,
  success: [10, 50, 10], // Double tap
  warning: [20, 100, 20, 100, 20], // Triple tap
  error: [50, 100, 50], // Strong double tap
};

// ============================================================================
// useHaptic Hook
// ============================================================================

/**
 * useHaptic - Haptic feedback (vibration) hook
 *
 * Features:
 * - Predefined vibration patterns (light, medium, heavy, success, warning, error)
 * - Custom vibration patterns support
 * - Automatic feature detection (checks if vibration API available)
 * - No-op on devices without vibration support
 *
 * Usage:
 * ```tsx
 * const { vibrate, isSupported } = useHaptic();
 *
 * <Button onClick={() => vibrate('light')}>
 *   Click me
 * </Button>
 * ```
 */
export function useHaptic() {
  // Check if vibration API is supported
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  /**
   * Trigger haptic feedback with predefined pattern
   * @param pattern - Haptic pattern name or custom vibration pattern
   */
  const vibrate = useCallback(
    (pattern: HapticPattern | number | number[]) => {
      if (!isSupported) {
        return;
      }

      try {
        // Get vibration pattern
        const vibrationPattern =
          typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;

        // Trigger vibration
        navigator.vibrate(vibrationPattern);
      } catch (error) {
        // Silently fail if vibration not supported or blocked
        console.warn('Haptic feedback failed:', error);
      }
    },
    [isSupported]
  );

  /**
   * Cancel any ongoing vibration
   */
  const cancel = useCallback(() => {
    if (!isSupported) {
      return;
    }

    try {
      navigator.vibrate(0);
    } catch (error) {
      console.warn('Cancel haptic feedback failed:', error);
    }
  }, [isSupported]);

  return {
    vibrate,
    cancel,
    isSupported,
  };
}
