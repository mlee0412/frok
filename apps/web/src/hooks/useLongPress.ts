import { useRef, useCallback, useState } from 'react';

/**
 * Position coordinates
 */
interface Position {
  x: number;
  y: number;
}

/**
 * Long-press hook options
 */
export interface UseLongPressOptions {
  /**
   * Callback fired when long-press succeeds
   */
  onLongPress: (event: TouchEvent | MouseEvent, position: Position) => void;

  /**
   * Duration threshold for long-press in milliseconds
   * @default 800
   */
  threshold?: number;

  /**
   * Movement threshold in pixels before canceling long-press
   * @default 10
   */
  moveThreshold?: number;

  /**
   * Enable haptic feedback on long-press
   * @default true
   */
  hapticFeedback?: boolean;

  /**
   * Callback fired when long-press starts (after threshold)
   * @default undefined
   */
  onStart?: () => void;

  /**
   * Callback fired when long-press is canceled
   * @default undefined
   */
  onCancel?: () => void;
}

/**
 * Hook for detecting long-press gestures on touch and mouse devices.
 *
 * Features:
 * - Detects both touch and mouse events
 * - Configurable duration threshold (default 800ms)
 * - Cancels on movement (default 10px)
 * - Optional haptic feedback
 * - Cleanup on unmount
 *
 * @example
 * ```tsx
 * const { handlers, isLongPressing } = useLongPress({
 *   onLongPress: (event, position) => {
 *     console.log('Long press at', position);
 *   },
 *   threshold: 800,
 * });
 *
 * return <div {...handlers}>Press and hold</div>;
 * ```
 */
export function useLongPress(options: UseLongPressOptions) {
  const {
    onLongPress,
    threshold = 800,
    moveThreshold = 10,
    hapticFeedback = true,
    onStart,
    onCancel,
  } = options;

  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<Position | null>(null);
  const longPressTriggeredRef = useRef(false);

  /**
   * Trigger haptic feedback if supported
   */
  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && navigator.vibrate) {
      navigator.vibrate(50); // Short vibration pulse
    }
  }, [hapticFeedback]);

  /**
   * Calculate distance between two positions
   */
  const getDistance = useCallback((p1: Position, p2: Position): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Extract position from touch or mouse event
   */
  const getEventPosition = useCallback(
    (event: TouchEvent | MouseEvent | React.TouchEvent | React.MouseEvent): Position => {
      if ('touches' in event && event.touches.length > 0) {
        // Touch event
        const touch = event.touches[0];
        if (touch) {
          return { x: touch.clientX, y: touch.clientY };
        }
      } else if ('clientX' in event) {
        // Mouse event
        return { x: event.clientX, y: event.clientY };
      }
      return { x: 0, y: 0 };
    },
    []
  );

  /**
   * Clear the long-press timeout
   */
  const clearLongPressTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Cancel the long-press
   */
  const cancelLongPress = useCallback(() => {
    clearLongPressTimeout();
    setIsLongPressing(false);
    startPosRef.current = null;
    longPressTriggeredRef.current = false;
    onCancel?.();
  }, [clearLongPressTimeout, onCancel]);

  /**
   * Start long-press detection
   */
  const handleStart = useCallback(
    (event: TouchEvent | MouseEvent | React.TouchEvent | React.MouseEvent) => {
      // Prevent default only if not a touch event (preserve scrolling)
      if (!('touches' in event)) {
        event.preventDefault();
      }

      const position = getEventPosition(event);
      startPosRef.current = position;
      longPressTriggeredRef.current = false;

      // Start timeout
      timeoutRef.current = setTimeout(() => {
        if (startPosRef.current && !longPressTriggeredRef.current) {
          longPressTriggeredRef.current = true;
          setIsLongPressing(true);
          triggerHaptic();
          onStart?.();

          // Call onLongPress with native event
          const nativeEvent =
            'nativeEvent' in event
              ? (event as React.TouchEvent | React.MouseEvent).nativeEvent
              : (event as TouchEvent | MouseEvent);
          onLongPress(nativeEvent, startPosRef.current);
        }
      }, threshold);
    },
    [threshold, getEventPosition, triggerHaptic, onStart, onLongPress]
  );

  /**
   * Handle movement during long-press
   */
  const handleMove = useCallback(
    (event: TouchEvent | MouseEvent | React.TouchEvent | React.MouseEvent) => {
      if (!startPosRef.current) return;

      const currentPos = getEventPosition(event);
      const distance = getDistance(startPosRef.current, currentPos);

      // Cancel if moved too far
      if (distance > moveThreshold) {
        cancelLongPress();
      }
    },
    [getEventPosition, getDistance, moveThreshold, cancelLongPress]
  );

  /**
   * End long-press detection
   */
  const handleEnd = useCallback(() => {
    // If long-press was triggered, don't cancel (menu is already open)
    if (!longPressTriggeredRef.current) {
      cancelLongPress();
    } else {
      // Just clean up the timeout and reset state
      clearLongPressTimeout();
      setIsLongPressing(false);
      startPosRef.current = null;
    }
  }, [clearLongPressTimeout, cancelLongPress]);

  /**
   * React event handlers
   */
  const handlers = {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    onMouseMove: handleMove,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchCancel: handleEnd,
    onTouchMove: handleMove,
  };

  return {
    handlers,
    isLongPressing,
    cancel: cancelLongPress,
  };
}
