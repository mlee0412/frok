/**
 * Validation schemas for agent API routes
 */

import { z } from 'zod';
import { uuidSchema } from './common';

/**
 * Agent memory types
 */
export const agentMemoryTypeSchema = z.enum([
  'core',
  'user_preference',
  'fact',
  'skill',
  'observation',
  'reflection',
]);

/**
 * GET /api/agent/memory - List agent memories
 */
export const listAgentMemoriesSchema = z.object({
  agent_name: z.string().min(1).max(100).optional().default('FROK Assistant'),
  type: agentMemoryTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
});

/**
 * POST /api/agent/memory - Add agent memory
 */
export const addAgentMemorySchema = z.object({
  agent_name: z.string().min(1).max(100).optional().default('FROK Assistant'),
  memory_type: agentMemoryTypeSchema,
  content: z.string().min(1).max(5000),
  importance: z.number().min(1).max(10).default(5),
  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * DELETE /api/agent/memory - Delete agent memory
 */
export const deleteAgentMemorySchema = z.object({
  id: uuidSchema,
});

/**
 * POST /api/agent/run - Run agent workflow
 */
export const runAgentSchema = z.object({
  input_as_text: z.string().min(1).max(10000),
  images: z.array(z.string().url()).optional().default([]),
  thread_id: uuidSchema.optional(),
  settings: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).optional(),
});

/**
 * POST /api/agent/stream - Stream agent response
 */
export const streamAgentSchema = z.object({
  input_as_text: z.string().min(1).max(10000),
  images: z.array(z.string().url()).optional().default([]),
  thread_id: uuidSchema.optional(),
});

/**
 * POST /api/agent/smart-stream - Smart streaming agent
 */
export const smartStreamAgentSchema = z.object({
  input_as_text: z.string().min(1).max(10000),
  images: z.array(z.string().url()).optional().default([]),
  thread_id: uuidSchema.optional(),
  user_model_preference: z.string().optional(),
});

/**
 * POST /api/agent/classify - Classify query complexity
 */
export const classifyQuerySchema = z.object({
  query: z.string().min(1).max(1000),
});
