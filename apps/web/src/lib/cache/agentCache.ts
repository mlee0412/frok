/**
 * Agent Response Caching System
 *
 * Implements intelligent caching for agent responses to reduce API costs
 * and improve response times for repeated queries.
 */

import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

type CachedResponse = {
  output: string;
  metadata: {
    model?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
    routing?: 'direct' | 'orchestrator';
    toolsUsed?: string[];
    toolSource?: string;
    models?: Record<string, string>;
  };
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  userId: string;
  threadId?: string;
};

type CacheStats = {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  size: number;
  oldestEntry: number;
  newestEntry: number;
};

// ============================================================================
// Configuration
// ============================================================================

const CACHE_CONFIG = {
  // Default TTL in milliseconds
  defaultTTL: 5 * 60 * 1000, // 5 minutes

  // TTL by complexity
  simpleTTL: 10 * 60 * 1000, // 10 minutes (simple queries more cacheable)
  moderateTTL: 5 * 60 * 1000, // 5 minutes
  complexTTL: 2 * 60 * 1000, // 2 minutes (complex queries less cacheable)

  // Maximum cache size (number of entries)
  maxSize: 1000,

  // Maximum cache size in bytes (approximate)
  maxSizeBytes: 50 * 1024 * 1024, // 50 MB

  // Cleanup interval
  cleanupInterval: 60 * 1000, // 1 minute
};

// ============================================================================
// Cache Implementation
// ============================================================================

class AgentResponseCache {
  private cache = new Map<string, CachedResponse>();
  private stats = {
    hits: 0,
    misses: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Generate cache key from query + user context
   */
  private getCacheKey(query: string, userId: string, threadId?: string): string {
    // Normalize query (lowercase, trim, remove extra whitespace)
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');

    // Include thread context for thread-specific caching
    const contextString = threadId
      ? `${normalizedQuery}:${userId}:${threadId}`
      : `${normalizedQuery}:${userId}`;

    // Hash for consistent key length
    const hash = createHash('sha256').update(contextString).digest('hex');

    return hash.substring(0, 16);
  }

  /**
   * Check if query is cacheable
   */
  private isCacheable(query: string, metadata?: Partial<CachedResponse['metadata']>): boolean {
    // Don't cache time-sensitive queries
    const timeSensitive = /\b(now|today|current|latest|right now|this moment|just now)\b/i;
    if (timeSensitive.test(query)) return false;

    // Don't cache action commands (only informational queries)
    const isAction = /\b(turn on|turn off|set|change|control|activate|deactivate|enable|disable)\b/i;
    if (isAction.test(query)) return false;

    // Don't cache if using code interpreter (dynamic execution)
    if (metadata?.toolsUsed?.includes('code_interpreter')) return false;

    // Don't cache if using computer use (actions)
    if (metadata?.toolsUsed?.includes('computer_use')) return false;

    // Don't cache memory add operations
    if (metadata?.toolsUsed?.includes('memory_add')) return false;

    return true;
  }

  /**
   * Get TTL based on complexity and tools used
   */
  private getTTL(complexity?: 'simple' | 'moderate' | 'complex', toolsUsed?: string[]): number {
    // Longer TTL for simple queries
    if (complexity === 'simple') return CACHE_CONFIG.simpleTTL;

    // Shorter TTL for web search results (can become stale)
    if (toolsUsed?.includes('web_search')) {
      return 2 * 60 * 1000; // 2 minutes
    }

    // Default based on complexity
    if (complexity === 'complex') return CACHE_CONFIG.complexTTL;
    if (complexity === 'moderate') return CACHE_CONFIG.moderateTTL;

    return CACHE_CONFIG.defaultTTL;
  }

  /**
   * Get cached response
   */
  async get(
    query: string,
    userId: string,
    threadId?: string
  ): Promise<CachedResponse | null> {
    const key = this.getCacheKey(query, userId, threadId);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count
    cached.hitCount++;
    this.cache.set(key, cached);

    this.stats.hits++;
    return cached;
  }

  /**
   * Set cached response
   */
  async set(
    query: string,
    userId: string,
    response: Omit<CachedResponse, 'timestamp' | 'expiresAt' | 'hitCount' | 'userId' | 'threadId'>,
    threadId?: string
  ): Promise<void> {
    // Check if cacheable
    if (!this.isCacheable(query, response.metadata)) {
      return;
    }

    const key = this.getCacheKey(query, userId, threadId);

    // Calculate TTL
    const ttl = this.getTTL(response.metadata.complexity, response.metadata.toolsUsed);

    // Create cache entry
    const entry: CachedResponse = {
      ...response,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hitCount: 0,
      userId,
      threadId,
    };

    // Check cache size limits
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  /**
   * Clear cache for specific user
   */
  clearForUser(userId: string): number {
    let cleared = 0;
    for (const [key, value] of this.cache.entries()) {
      if (value.userId === userId) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Clear cache for specific thread
   */
  clearForThread(threadId: string): number {
    let cleared = 0;
    for (const [key, value] of this.cache.entries()) {
      if (value.threadId === threadId) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[cache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map((e) => e.timestamp);

    // Calculate approximate size
    const approxSize = entries.reduce((sum, entry) => {
      return sum + entry.output.length + JSON.stringify(entry.metadata).length;
    }, 0);

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses || 1),
      size: approxSize,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Get top cached queries (by hit count)
   */
  getTopQueries(limit: number = 10): Array<{
    hitCount: number;
    metadata: CachedResponse['metadata'];
    age: number;
  }> {
    const entries = Array.from(this.cache.values());

    return entries
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit)
      .map((entry) => ({
        hitCount: entry.hitCount,
        metadata: entry.metadata,
        age: Date.now() - entry.timestamp,
      }));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cacheInstance: AgentResponseCache | null = null;

/**
 * Get or create cache instance
 */
function getAgentCache(): AgentResponseCache {
  if (!cacheInstance) {
    cacheInstance = new AgentResponseCache();
  }
  return cacheInstance;
}

/**
 * Export default instance
 */
export const agentCache = getAgentCache();

// ============================================================================
// Cache Warmup (Optional)
// ============================================================================

/**
 * Pre-populate cache with common queries
 */
export async function warmupCache(
  commonQueries: Array<{
    query: string;
    userId: string;
    response: Omit<CachedResponse, 'timestamp' | 'expiresAt' | 'hitCount' | 'userId' | 'threadId'>;
  }>
): Promise<void> {
  const cache = getAgentCache();

  for (const { query, userId, response } of commonQueries) {
    await cache.set(query, userId, response);
  }

  console.log(`[cache] Warmed up cache with ${commonQueries.length} entries`);
}

// ============================================================================
// Export
// ============================================================================

export {
  AgentResponseCache,
  getAgentCache,
  type CachedResponse,
  type CacheStats,
};
