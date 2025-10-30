/**
 * Chat-related validation schemas
 */

import { z } from 'zod';
import { uuidSchema, nonEmptyStringSchema, urlSchema } from './common';

/**
 * Create thread request body
 */
export const createThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  agentId: z.string().optional().default('default'), // Default to 'default' agent
  model: z.string().optional(),
  enabledTools: z.array(z.string()).optional(),
  agentStyle: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Update thread request body
 */
export const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  folder: z.string().optional(),
  enabled_tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  agent_style: z.string().optional(),
}).strict(); // Reject unknown keys

/**
 * Create message request body
 * Note: Uses snake_case to match frontend API calls
 * Note: thread_id can be a temporary ID (not a UUID) during optimistic updates
 */
export const createMessageSchema = z.object({
  thread_id: z.string().min(1), // Accept any non-empty string (could be temp ID)
  content: nonEmptyStringSchema.max(50000), // Max 50k characters
  role: z.enum(['user', 'assistant', 'system']).default('user'),
  file_urls: z.array(urlSchema).max(10).optional(), // Max 10 files
  model: z.string().optional(),
});

/**
 * Thread ID parameter
 */
export const threadIdParamSchema = z.object({
  threadId: uuidSchema,
});

/**
 * Share thread request body
 */
export const shareThreadSchema = z.object({
  isPublic: z.boolean(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

/**
 * Suggest title request body (no body, just threadId in params)
 */
export const suggestTitleParamSchema = z.object({
  threadId: uuidSchema,
});

/**
 * Message list query parameters
 * Note: Uses snake_case to match frontend API calls
 * Note: thread_id can be a temporary ID (not a UUID) during optimistic updates
 */
export const messageListQuerySchema = z.object({
  thread_id: z.string().min(1), // Accept any non-empty string (could be temp ID)
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  since: z.string().datetime({ offset: true }).optional(),
});
