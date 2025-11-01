/**
 * Structured Output Schemas for Agent Responses
 *
 * Provides type-safe, validated response formats for agent outputs.
 * Uses Zod for schema definition and runtime validation.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// Base Response Schema
// ============================================================================

export const BaseResponseSchema = z.object({
  answer: z.string().describe('The main response to the user query'),
  confidence: z.number().min(0).max(1).describe('Confidence level of the response (0-1)'),
  followUpQuestions: z.array(z.string()).optional().describe('Suggested follow-up questions'),
  timestamp: z.string().datetime().describe('Response generation timestamp'),
});

// ============================================================================
// Research/Information Response Schema
// ============================================================================

export const SourceSchema = z.object({
  title: z.string().describe('Title of the source'),
  url: z.string().url().describe('URL of the source'),
  snippet: z.string().optional().describe('Relevant excerpt from the source'),
  relevanceScore: z.number().min(0).max(1).optional().describe('Relevance to query'),
});

export const ResearchResponseSchema = BaseResponseSchema.extend({
  type: z.literal('research').describe('Response type identifier'),
  sources: z.array(SourceSchema).describe('Sources used in the response'),
  keyFindings: z.array(z.string()).describe('Key findings from research'),
  confidence: z.number().min(0).max(1).describe('Overall confidence in findings'),
  toolsUsed: z.array(z.string()).describe('Tools used to gather information'),
});

// ============================================================================
// Smart Home Control Response Schema
// ============================================================================

export const DeviceActionSchema = z.object({
  entityId: z.string().describe('Home Assistant entity ID'),
  action: z.string().describe('Action performed (turn_on, turn_off, etc.)'),
  previousState: z.string().optional().describe('State before action'),
  newState: z.string().describe('State after action'),
  verified: z.boolean().describe('Whether the action was verified'),
});

export const SmartHomeResponseSchema = BaseResponseSchema.extend({
  type: z.literal('smart_home').describe('Response type identifier'),
  actions: z.array(DeviceActionSchema).describe('Smart home actions performed'),
  affectedDevices: z.number().describe('Number of devices affected'),
  success: z.boolean().describe('Whether all actions succeeded'),
  failures: z.array(z.object({
    entityId: z.string(),
    error: z.string(),
  })).optional().describe('Failed actions if any'),
});

// ============================================================================
// Memory/Preferences Response Schema
// ============================================================================

export const MemoryItemSchema = z.object({
  id: z.string().describe('Memory ID'),
  content: z.string().describe('Memory content'),
  tags: z.array(z.string()).describe('Memory tags'),
  relevanceScore: z.number().min(0).max(1).describe('Relevance to query'),
  createdAt: z.string().datetime().describe('When memory was created'),
});

export const MemoryResponseSchema = BaseResponseSchema.extend({
  type: z.literal('memory').describe('Response type identifier'),
  memoriesRetrieved: z.array(MemoryItemSchema).describe('Retrieved memories'),
  memoriesAdded: z.array(z.object({
    content: z.string(),
    tags: z.array(z.string()),
  })).optional().describe('New memories added'),
  totalMemories: z.number().describe('Total memories searched'),
});

// ============================================================================
// Code Execution Response Schema
// ============================================================================

export const CodeExecutionSchema = z.object({
  code: z.string().describe('Code that was executed'),
  language: z.string().describe('Programming language'),
  output: z.string().describe('Execution output'),
  success: z.boolean().describe('Whether execution succeeded'),
  error: z.string().optional().describe('Error message if failed'),
  executionTimeMs: z.number().optional().describe('Execution time in milliseconds'),
});

export const CodeResponseSchema = BaseResponseSchema.extend({
  type: z.literal('code').describe('Response type identifier'),
  executions: z.array(CodeExecutionSchema).describe('Code executions performed'),
  explanation: z.string().describe('Explanation of the code and results'),
  recommendations: z.array(z.string()).optional().describe('Recommendations or improvements'),
});

// ============================================================================
// Multi-Agent Orchestration Response Schema
// ============================================================================

export const AgentHandoffSchema = z.object({
  fromAgent: z.string().describe('Agent that initiated handoff'),
  toAgent: z.string().describe('Agent that received handoff'),
  reason: z.string().describe('Reason for handoff'),
  timestamp: z.string().datetime().describe('When handoff occurred'),
});

export const OrchestrationResponseSchema = BaseResponseSchema.extend({
  type: z.literal('orchestration').describe('Response type identifier'),
  primaryAgent: z.string().describe('Primary agent that handled the query'),
  handoffs: z.array(AgentHandoffSchema).describe('Agent handoffs that occurred'),
  agentsInvolved: z.array(z.string()).describe('All agents involved'),
  complexity: z.enum(['simple', 'moderate', 'complex']).describe('Query complexity'),
  toolsUsed: z.array(z.string()).describe('All tools used across agents'),
});

// ============================================================================
// Error Response Schema
// ============================================================================

export const ErrorResponseSchema = z.object({
  type: z.literal('error').describe('Response type identifier'),
  error: z.string().describe('Error message'),
  errorCode: z.string().optional().describe('Error code for categorization'),
  suggestion: z.string().optional().describe('Suggestion for user to resolve'),
  retryable: z.boolean().describe('Whether user can retry'),
  timestamp: z.string().datetime().describe('When error occurred'),
});

// ============================================================================
// Generic Agent Response (Union of all types)
// ============================================================================

export const AgentResponseSchema = z.discriminatedUnion('type', [
  ResearchResponseSchema,
  SmartHomeResponseSchema,
  MemoryResponseSchema,
  CodeResponseSchema,
  OrchestrationResponseSchema,
  ErrorResponseSchema,
]);

// ============================================================================
// Type Exports
// ============================================================================

export type BaseResponse = z.infer<typeof BaseResponseSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type ResearchResponse = z.infer<typeof ResearchResponseSchema>;
export type DeviceAction = z.infer<typeof DeviceActionSchema>;
export type SmartHomeResponse = z.infer<typeof SmartHomeResponseSchema>;
export type MemoryItem = z.infer<typeof MemoryItemSchema>;
export type MemoryResponse = z.infer<typeof MemoryResponseSchema>;
export type CodeExecution = z.infer<typeof CodeExecutionSchema>;
export type CodeResponse = z.infer<typeof CodeResponseSchema>;
export type AgentHandoff = z.infer<typeof AgentHandoffSchema>;
export type OrchestrationResponse = z.infer<typeof OrchestrationResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// ============================================================================
// JSON Schema Conversion for OpenAI
// ============================================================================

/**
 * Convert Zod schema to JSON Schema format for OpenAI's response_format
 */
export function getResponseFormat(schema: z.ZodType, name: string) {
  return {
    type: 'json_schema' as const,
    json_schema: {
      name,
      strict: true,
      schema: zodToJsonSchema(schema, name),
    },
  };
}

// Pre-generated response formats for common use cases
export const ResponseFormats = {
  research: getResponseFormat(ResearchResponseSchema, 'research_response'),
  smartHome: getResponseFormat(SmartHomeResponseSchema, 'smart_home_response'),
  memory: getResponseFormat(MemoryResponseSchema, 'memory_response'),
  code: getResponseFormat(CodeResponseSchema, 'code_response'),
  orchestration: getResponseFormat(OrchestrationResponseSchema, 'orchestration_response'),
  error: getResponseFormat(ErrorResponseSchema, 'error_response'),
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse and validate agent response
 */
export function parseAgentResponse(jsonString: string): AgentResponse {
  const parsed = JSON.parse(jsonString);
  return AgentResponseSchema.parse(parsed);
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  options?: {
    errorCode?: string;
    suggestion?: string;
    retryable?: boolean;
  }
): ErrorResponse {
  return {
    type: 'error',
    error,
    errorCode: options?.errorCode,
    suggestion: options?.suggestion,
    retryable: options?.retryable ?? true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Determine appropriate response schema based on query and tools
 */
export function selectResponseSchema(
  query: string,
  enabledTools: string[]
): { schema: z.ZodType; format: ReturnType<typeof getResponseFormat> } {
  const queryLower = query.toLowerCase();

  // Smart home queries
  if (
    enabledTools.includes('home_assistant') &&
    /\b(turn|set|control|dim|brighten|adjust)\b/i.test(query)
  ) {
    return {
      schema: SmartHomeResponseSchema,
      format: ResponseFormats.smartHome,
    };
  }

  // Memory/preferences queries
  if (
    enabledTools.includes('memory') &&
    /\b(remember|forget|recall|preference|save|store)\b/i.test(query)
  ) {
    return {
      schema: MemoryResponseSchema,
      format: ResponseFormats.memory,
    };
  }

  // Code execution queries
  if (
    enabledTools.includes('code_interpreter') &&
    /\b(calculate|compute|analyze|process|code|script)\b/i.test(query)
  ) {
    return {
      schema: CodeResponseSchema,
      format: ResponseFormats.code,
    };
  }

  // Research queries (default for web_search)
  if (
    enabledTools.includes('web_search') ||
    /\b(search|find|lookup|research|latest|current)\b/i.test(query)
  ) {
    return {
      schema: ResearchResponseSchema,
      format: ResponseFormats.research,
    };
  }

  // Default to orchestration for complex queries
  return {
    schema: OrchestrationResponseSchema,
    format: ResponseFormats.orchestration,
  };
}
