/**
 * Rate limiting middleware for API routes
 * Uses Upstash Redis in production, in-memory cache in development
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limit configuration
 */
type RateLimitConfig = {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Optional identifier function (default: IP address)
   */
  identifier?: (req: NextRequest) => string | Promise<string>;
};

type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * In-memory rate limiter for development
 */
class InMemoryRateLimiter {
  private requests = new Map<string, number[]>();

  check(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // Remove old requests outside the time window
    const validRequests = userRequests.filter((timestamp) => now - timestamp < windowMs);

    // Check if user has exceeded limit
    if (validRequests.length >= limit) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to cleanup
      this.cleanup(windowMs);
    }

    return true;
  }

  private cleanup(windowMs: number) {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}

// Global in-memory rate limiter instance
const memoryLimiter = new InMemoryRateLimiter();

// Upstash rate limiters (created on demand)
const upstashLimiters = new Map<string, Ratelimit>();

/**
 * Get or create an Upstash rate limiter
 */
function getUpstashLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  const redisUrl = process.env["UPSTASH_REDIS_REST_URL"];
  const redisToken = process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (!redisUrl || !redisToken) {
    return null;
  }

  const key = `${maxRequests}:${windowMs}`;
  let limiter = upstashLimiters.get(key);

  if (!limiter) {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
      analytics: true,
      prefix: 'frok:ratelimit',
    });

    upstashLimiters.set(key, limiter);
  }

  return limiter;
}

/**
 * Default identifier function - uses IP address or user ID from header
 */
function defaultIdentifier(req: NextRequest): string {
  // Try to get user ID from custom header (set by auth middleware)
  const userId = req.headers.get('x-user-id');
  if (userId) return userId;

  // Fall back to IP address
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim();
    if (ip) return ip;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Last resort - use a default identifier
  return 'anonymous';
}

/**
 * Rate limit middleware
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   // Apply rate limit: 10 requests per minute
 *   const rateLimit = await withRateLimit(req, {
 *     maxRequests: 10,
 *     windowMs: 60000, // 1 minute
 *   });
 *
 *   if (!rateLimit.ok) return rateLimit.response;
 *
 *   // Process request...
 * }
 * ```
 */
export async function withRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, identifier = defaultIdentifier } = config;

  try {
    const id = await identifier(req);

    // Try Upstash in production
    const upstashLimiter = getUpstashLimiter(maxRequests, windowMs);

    if (upstashLimiter) {
      // Use Upstash rate limiter
      const { success, limit, reset, remaining } = await upstashLimiter.limit(id);

      if (!success) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              ok: false,
              error: 'Rate limit exceeded',
              limit,
              remaining,
              reset: new Date(reset).toISOString(),
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
                'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
              },
            }
          ),
        };
      }

      return { ok: true };
    } else {
      // Fall back to in-memory rate limiter
      const allowed = memoryLimiter.check(id, maxRequests, windowMs);

      if (!allowed) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              ok: false,
              error: 'Rate limit exceeded',
              limit: maxRequests,
              window: `${windowMs}ms`,
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil(windowMs / 1000).toString(),
              },
            }
          ),
        };
      }

      return { ok: true };
    }
  } catch (error: unknown) {
    // Log error but don't block requests if rate limiting fails
    console.error('[Rate limit error]', error);
    return { ok: true };
  }
}

/**
 * Preset rate limit configurations
 */
export const rateLimitPresets = {
  /**
   * Strict limit for expensive AI operations
   * 5 requests per minute
   */
  ai: {
    maxRequests: 5,
    windowMs: 60000,
  },

  /**
   * Standard limit for API routes
   * 60 requests per minute
   */
  standard: {
    maxRequests: 60,
    windowMs: 60000,
  },

  /**
   * Generous limit for read operations
   * 120 requests per minute
   */
  read: {
    maxRequests: 120,
    windowMs: 60000,
  },

  /**
   * Tight limit for authentication attempts
   * 5 requests per 15 minutes
   */
  auth: {
    maxRequests: 5,
    windowMs: 900000,
  },
} as const;
