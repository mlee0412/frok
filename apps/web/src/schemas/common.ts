/**
 * Common validation schemas used across multiple routes
 */

import { z } from 'zod';

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * ISO date string validation
 */
export const isoDateSchema = z.string().datetime({ offset: true });

/**
 * Non-empty string validation
 */
export const nonEmptyStringSchema = z.string().min(1, 'Cannot be empty');

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Search query parameters
 */
export const searchQuerySchema = z.object({
  q: z.string().optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email format');

/**
 * Positive number validation
 */
export const positiveNumberSchema = z.number().positive('Must be positive');

/**
 * Non-negative number validation
 */
export const nonNegativeNumberSchema = z.number().nonnegative('Must be non-negative');
