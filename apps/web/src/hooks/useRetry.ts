import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseRetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Delay between retries in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Whether to use exponential backoff
   * @default true
   */
  exponentialBackoff?: boolean;

  /**
   * Callback when all retries are exhausted
   */
  onMaxAttemptsReached?: () => void;
}

export interface UseRetryResult<T> {
  /**
   * Execute the operation with retry logic
   */
  execute: () => Promise<T>;

  /**
   * Whether operation is currently executing
   */
  isLoading: boolean;

  /**
   * Last error encountered
   */
  error: Error | null;

  /**
   * Current attempt number (0 = first try)
   */
  attemptCount: number;

  /**
   * Reset the retry state
   */
  reset: () => void;
}

// ============================================================================
// useRetry Hook
// ============================================================================

/**
 * useRetry - Automatic retry logic for failed operations
 *
 * Features:
 * - Configurable max attempts and delay
 * - Exponential backoff support
 * - Loading and error state tracking
 * - Attempt count tracking
 * - Manual reset capability
 *
 * Usage:
 * ```tsx
 * const { execute, isLoading, error, attemptCount } = useRetry(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Failed');
 *     return response.json();
 *   },
 *   { maxAttempts: 3, retryDelay: 1000, exponentialBackoff: true }
 * );
 * ```
 */
export function useRetry<T>(
  operation: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryResult<T> {
  const {
    maxAttempts = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onMaxAttemptsReached,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setAttemptCount(0);
  }, []);

  const execute = useCallback(async (): Promise<T> => {
    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      setAttemptCount(attempt);

      try {
        const result = await operation();
        setIsLoading(false);
        setAttemptCount(0);
        return result;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        setError(lastError);

        // Don't delay after last attempt
        if (attempt < maxAttempts - 1) {
          const delay = exponentialBackoff
            ? retryDelay * Math.pow(2, attempt)
            : retryDelay;

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts exhausted
    setIsLoading(false);
    if (onMaxAttemptsReached) {
      onMaxAttemptsReached();
    }

    throw lastError || new Error('Operation failed after all retries');
  }, [operation, maxAttempts, retryDelay, exponentialBackoff, onMaxAttemptsReached]);

  return {
    execute,
    isLoading,
    error,
    attemptCount,
    reset,
  };
}
