/**
 * Type-safe in-memory cache with TTL support
 */

export type CacheOptions = {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

export class Cache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000; // Default 5 minutes
    this.maxSize = options.maxSize ?? 100;
  }

  set(key: string, data: T): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean up expired entries first
    this.cleanExpired();
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Memoize async functions with caching
 */
export function memoize<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: CacheOptions & { keyFn?: (...args: Args) => string } = {}
): (...args: Args) => Promise<Result> {
  const cache = new Cache<Result>(options);
  const { keyFn = (...args) => JSON.stringify(args) } = options;

  return async (...args: Args): Promise<Result> => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * React hook for memoized async data fetching
 */
export function createCachedFetcher<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  ttl = 30000 // 30 seconds default
): () => Promise<T> {
  const cache = new Cache<T>({ ttl });

  return async () => {
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    cache.set(cacheKey, data);
    return data;
  };
}
