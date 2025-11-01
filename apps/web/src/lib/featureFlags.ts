/**
 * Feature Flags System
 *
 * Supports both Vercel Edge Config (production) and local configuration (development).
 *
 * Usage:
 * ```typescript
 * import { getFeatureFlag, getAllFeatureFlags } from '@/lib/featureFlags';
 *
 * // Check a single flag
 * const isEnabled = await getFeatureFlag('newDashboard');
 *
 * // Get all flags
 * const flags = await getAllFeatureFlags();
 * ```
 */

export type FeatureFlags = {
  // UI Features
  newDashboard: boolean;
  betaChat: boolean;
  agentMemoryUI: boolean;

  // API Features
  rateLimit: boolean;
  cachingEnabled: boolean;

  // Experimental Features
  voiceInput: boolean;
  imageGeneration: boolean;
  advancedSearch: boolean;

  // System Features
  maintenanceMode: boolean;
  debugMode: boolean;
};

/**
 * Default feature flag values for development
 */
const DEFAULT_FLAGS: FeatureFlags = {
  // UI Features
  newDashboard: false,
  betaChat: false,
  agentMemoryUI: true,

  // API Features
  rateLimit: true,
  cachingEnabled: true,

  // Experimental Features
  voiceInput: false,
  imageGeneration: false,
  advancedSearch: false,

  // System Features
  maintenanceMode: false,
  debugMode: process.env.NODE_ENV === 'development',
};

/**
 * Get feature flags from Vercel Edge Config (if available) or use defaults
 */
async function getEdgeConfigFlags(): Promise<FeatureFlags> {
  // Check if we're in a Vercel environment with Edge Config
  if (process.env['EDGE_CONFIG']) {
    try {
      const { get } = await import('@vercel/edge-config');
      const flags = await get<FeatureFlags>('featureFlags');

      if (flags) {
        // Merge with defaults to ensure all flags exist
        return { ...DEFAULT_FLAGS, ...flags };
      }
    } catch (error: unknown) {
      console.warn('[FeatureFlags] Failed to load from Edge Config:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return DEFAULT_FLAGS;
}

/**
 * In-memory cache for feature flags (1 minute TTL)
 */
let flagsCache: FeatureFlags | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get all feature flags (cached)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlags> {
  const now = Date.now();

  // Return cached flags if still valid
  if (flagsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return flagsCache;
  }

  // Fetch fresh flags
  flagsCache = await getEdgeConfigFlags();
  cacheTimestamp = now;

  return flagsCache;
}

/**
 * Get a specific feature flag value
 */
export async function getFeatureFlag<K extends keyof FeatureFlags>(
  flag: K
): Promise<FeatureFlags[K]> {
  const flags = await getAllFeatureFlags();
  return flags[flag];
}

/**
 * Check if a feature is enabled
 * Alias for getFeatureFlag for better readability
 */
export async function isFeatureEnabled(flag: keyof FeatureFlags): Promise<boolean> {
  return getFeatureFlag(flag);
}

/**
 * Clear the feature flags cache (useful for testing)
 */
export function clearFeatureFlagsCache(): void {
  flagsCache = null;
  cacheTimestamp = 0;
}

/**
 * Get feature flags synchronously (uses cached values or defaults)
 * WARNING: May return stale data. Use async functions when possible.
 */
export function getFeatureFlagsSync(): FeatureFlags {
  return flagsCache || DEFAULT_FLAGS;
}
