import { z } from 'zod';

/**
 * Schema for /api/ha/search
 * Search for Home Assistant entities and areas
 */
export const HASearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(100, 'Query too long'),
  domain: z.string().max(50).optional(),
});

export type HASearchInput = z.infer<typeof HASearchSchema>;

/**
 * Schema for /api/ha/call and /api/ha/service
 * Call a Home Assistant service
 */
export const HAServiceCallSchema = z.object({
  domain: z.string().min(1, 'Domain is required').max(50, 'Domain too long'),
  service: z.string().min(1, 'Service is required').max(50, 'Service too long'),
  entity_id: z.union([
    z.string().min(1),
    z.array(z.string().min(1)),
  ]).optional(),
  area_id: z.union([
    z.string().min(1),
    z.array(z.string().min(1)),
  ]).optional(),
  target: z.record(z.unknown()).optional(),
  data: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.entity_id || data.area_id || data.target,
  {
    message: 'At least one of entity_id, area_id, or target is required',
    path: ['entity_id'],
  }
);

export type HAServiceCallInput = z.infer<typeof HAServiceCallSchema>;
