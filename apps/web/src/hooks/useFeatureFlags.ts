'use client';

import { useState, useEffect } from 'react';
import type { FeatureFlags } from '@/lib/featureFlags';
import { getFeatureFlagsSync } from '@/lib/featureFlags';

/**
 * React hook for accessing feature flags
 *
 * Usage:
 * ```typescript
 * const { flags, isFeatureEnabled } = useFeatureFlags();
 *
 * if (isFeatureEnabled('newDashboard')) {
 *   return <NewDashboard />;
 * }
 * ```
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlagsSync());

  useEffect(() => {
    // Fetch fresh flags on mount
    async function fetchFlags() {
      try {
        const response = await fetch('/api/feature-flags');
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.flags) {
            setFlags(data.flags);
          }
        }
      } catch (error: unknown) {
        console.warn('[useFeatureFlags] Failed to fetch flags:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    fetchFlags();

    // Refresh flags every minute
    const interval = setInterval(fetchFlags, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Check if a specific feature is enabled
   */
  const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
    return flags[flag] === true;
  };

  return {
    flags,
    isFeatureEnabled,
  };
}

/**
 * Hook for checking a single feature flag
 *
 * Usage:
 * ```typescript
 * const isEnabled = useFeatureFlag('newDashboard');
 * ```
 */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(flag);
}
