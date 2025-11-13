'use client';

import { useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface GestureCallbacks {
  onSwipe?: (direction: SwipeDirection) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: (deltaX: number, deltaY: number) => void;
}

export interface GestureConfig {
  swipeThreshold?: number; // minimum distance for swipe (default: 50px)
  longPressDelay?: number; // delay for long press (default: 500ms)
  dragThreshold?: number; // minimum distance to start drag (default: 10px)
}

// ============================================================================
// useGestures Hook
// ============================================================================

/**
 * useGestures - Comprehensive gesture detection hook
 *
 * Features:
 * - Swipe detection (left, right, up, down) with configurable threshold
 * - Long press detection with configurable delay
 * - Drag tracking with delta calculations
 * - Touch and mouse event support
 * - Automatic cleanup
 *
 * @param callbacks - Gesture event handlers
 * @param config - Configuration options
 * @returns Ref to attach to the target element
 */
export function useGestures(callbacks: GestureCallbacks, config: GestureConfig = {}) {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    dragThreshold = 10,
  } = config;

  const elementRef = useRef<HTMLElement>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const currentPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const getPosition = useCallback((event: TouchEvent | MouseEvent) => {
    if ('touches' in event) {
      return {
        x: event.touches[0]?.clientX ?? 0,
        y: event.touches[0]?.clientY ?? 0,
      };
    }
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const calculateSwipeDirection = useCallback(
    (deltaX: number, deltaY: number): SwipeDirection | null => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Check if movement exceeds threshold
      if (absX < swipeThreshold && absY < swipeThreshold) {
        return null;
      }

      // Determine primary direction
      if (absX > absY) {
        return deltaX > 0 ? 'right' : 'left';
      } else {
        return deltaY > 0 ? 'down' : 'up';
      }
    },
    [swipeThreshold]
  );

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleStart = useCallback(
    (event: TouchEvent | MouseEvent) => {
      const pos = getPosition(event);
      startPos.current = pos;
      currentPos.current = pos;
      isDragging.current = false;

      // Start long press timer
      if (callbacks.onLongPress) {
        clearLongPressTimer();
        longPressTimer.current = setTimeout(() => {
          callbacks.onLongPress?.();
        }, longPressDelay);
      }
    },
    [callbacks, getPosition, clearLongPressTimer, longPressDelay]
  );

  const handleMove = useCallback(
    (event: TouchEvent | MouseEvent) => {
      if (!startPos.current) return;

      const pos = getPosition(event);
      currentPos.current = pos;

      const deltaX = pos.x - startPos.current.x;
      const deltaY = pos.y - startPos.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel long press if moved
      if (distance > dragThreshold) {
        clearLongPressTimer();
      }

      // Start dragging if threshold exceeded
      if (!isDragging.current && distance > dragThreshold) {
        isDragging.current = true;
        callbacks.onDragStart?.(startPos.current.x, startPos.current.y);
      }

      // Continue dragging
      if (isDragging.current) {
        callbacks.onDragMove?.(deltaX, deltaY);
      }
    },
    [callbacks, getPosition, clearLongPressTimer, dragThreshold]
  );

  const handleEnd = useCallback(() => {
    clearLongPressTimer();

    if (!startPos.current || !currentPos.current) {
      startPos.current = null;
      currentPos.current = null;
      isDragging.current = false;
      return;
    }

    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;

    // Handle drag end
    if (isDragging.current) {
      callbacks.onDragEnd?.(deltaX, deltaY);
    } else {
      // Handle swipe (only if not dragging)
      const direction = calculateSwipeDirection(deltaX, deltaY);
      if (direction) {
        callbacks.onSwipe?.(direction);
        switch (direction) {
          case 'left':
            callbacks.onSwipeLeft?.();
            break;
          case 'right':
            callbacks.onSwipeRight?.();
            break;
          case 'up':
            callbacks.onSwipeUp?.();
            break;
          case 'down':
            callbacks.onSwipeDown?.();
            break;
        }
      }
    }

    // Reset state
    startPos.current = null;
    currentPos.current = null;
    isDragging.current = false;
  }, [callbacks, clearLongPressTimer, calculateSwipeDirection]);

  // ============================================================================
  // Effect: Attach Event Listeners
  // ============================================================================

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Touch events
    element.addEventListener('touchstart', handleStart as EventListener, { passive: true });
    element.addEventListener('touchmove', handleMove as EventListener, { passive: true });
    element.addEventListener('touchend', handleEnd as EventListener, { passive: true });
    element.addEventListener('touchcancel', handleEnd as EventListener, { passive: true });

    // Mouse events
    element.addEventListener('mousedown', handleStart as EventListener);
    element.addEventListener('mousemove', handleMove as EventListener);
    element.addEventListener('mouseup', handleEnd as EventListener);
    element.addEventListener('mouseleave', handleEnd as EventListener);

    return () => {
      // Cleanup
      element.removeEventListener('touchstart', handleStart as EventListener);
      element.removeEventListener('touchmove', handleMove as EventListener);
      element.removeEventListener('touchend', handleEnd as EventListener);
      element.removeEventListener('touchcancel', handleEnd as EventListener);
      element.removeEventListener('mousedown', handleStart as EventListener);
      element.removeEventListener('mousemove', handleMove as EventListener);
      element.removeEventListener('mouseup', handleEnd as EventListener);
      element.removeEventListener('mouseleave', handleEnd as EventListener);
      clearLongPressTimer();
    };
  }, [handleStart, handleMove, handleEnd, clearLongPressTimer]);

  return elementRef;
}
