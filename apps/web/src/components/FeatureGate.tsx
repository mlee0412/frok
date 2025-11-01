'use client';

import type { ReactNode } from 'react';
import type { FeatureFlags } from '@/lib/featureFlags';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

export type FeatureGateProps = {
  /**
   * The feature flag to check
   */
  feature: keyof FeatureFlags;

  /**
   * Content to render when feature is enabled
   */
  children: ReactNode;

  /**
   * Optional fallback content when feature is disabled
   */
  fallback?: ReactNode;
};

/**
 * Component for conditionally rendering content based on feature flags
 *
 * Usage:
 * ```typescript
 * <FeatureGate feature="newDashboard">
 *   <NewDashboard />
 * </FeatureGate>
 *
 * // With fallback
 * <FeatureGate
 *   feature="betaChat"
 *   fallback={<OldChat />}
 * >
 *   <NewChat />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useFeatureFlag(feature);

  return isEnabled ? children : fallback;
}
