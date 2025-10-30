/**
 * Memory/knowledge base validation schemas
 */

import { z } from 'zod';
import { uuidSchema, nonEmptyStringSchema } from './common';

/**
 * Add memory request body
 */
export const addMemorySchema = z.object({
  content: nonEmptyStringSchema.max(10000), // Max 10k characters
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(), // Max 20 tags, 50 chars each
  metadata: z.record(z.string(), z.any()).optional(),
  importance: z.number().min(0).max(1).optional(), // 0-1 importance score
});

/**
 * Update memory request body
 */
export const updateMemorySchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  importance: z.number().min(0).max(1).optional(),
}).strict();

/**
 * Search memory query parameters
 */
export const searchMemoryQuerySchema = z.object({
  q: nonEmptyStringSchema, // Required search query
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minImportance: z.coerce.number().min(0).max(1).optional(),
});

/**
 * Memory ID parameter
 */
export const memoryIdParamSchema = z.object({
  memoryId: uuidSchema,
});
