/**
 * Streaming Progress System
 *
 * Phase 2.2: Real-time tool execution and agent handoff visibility
 *
 * This module provides utilities for streaming progress events during agent execution:
 * - Tool execution start/end events
 * - Agent handoff notifications
 * - Progress updates with timestamps
 * - Error notifications
 *
 * Event Types:
 * - metadata: Initial request metadata (model, complexity, tools)
 * - progress: Progress update with status message
 * - tool_start: Tool execution starting
 * - tool_end: Tool execution completed
 * - handoff: Agent handoff (orchestrator routing)
 * - delta: Content delta (text chunk)
 * - done: Final response with full content
 * - error: Error occurred
 */

export type ProgressEventType =
  | 'metadata'
  | 'progress'
  | 'tool_start'
  | 'tool_end'
  | 'handoff'
  | 'delta'
  | 'done'
  | 'error';

export type ProgressEvent = {
  type: ProgressEventType;
  timestamp: string;
  data: Record<string, unknown>;
};

export type ToolExecutionEvent = {
  tool_name: string;
  tool_description?: string;
  parameters?: Record<string, unknown>;
  duration_ms?: number;
  success?: boolean;
  result?: unknown;
};

export type HandoffEvent = {
  from_agent: string;
  to_agent: string;
  reason?: string;
};

export type ProgressUpdate = {
  status: string;
  message: string;
  progress_percent?: number;
};

/**
 * Progress Event Emitter
 *
 * Manages the lifecycle of progress events and ensures proper formatting
 * for server-sent events (SSE).
 */
export class ProgressEmitter {
  private encoder: TextEncoder;
  private controller: ReadableStreamDefaultController;
  private startTime: number;

  constructor(controller: ReadableStreamDefaultController) {
    this.encoder = new TextEncoder();
    this.controller = controller;
    this.startTime = Date.now();
  }

  /**
   * Emit a progress event
   */
  private emit(event: ProgressEvent): void {
    const payload = JSON.stringify(event);
    this.controller.enqueue(this.encoder.encode(`data: ${payload}\n\n`));
  }

  /**
   * Send metadata about the request
   */
  metadata(data: Record<string, unknown>): void {
    this.emit({
      type: 'metadata',
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Send a progress update
   */
  progress(status: string, message: string, progressPercent?: number): void {
    const update: ProgressUpdate = {
      status,
      message,
    };

    if (progressPercent !== undefined) {
      update.progress_percent = Math.min(100, Math.max(0, progressPercent));
    }

    this.emit({
      type: 'progress',
      timestamp: new Date().toISOString(),
      data: update,
    });
  }

  /**
   * Notify tool execution started
   */
  toolStart(toolName: string, parameters?: Record<string, unknown>, description?: string): void {
    const event: ToolExecutionEvent = {
      tool_name: toolName,
    };

    if (parameters) {
      // Sanitize parameters (remove sensitive data)
      event.parameters = this.sanitizeParameters(parameters);
    }

    if (description) {
      event.tool_description = description;
    }

    this.emit({
      type: 'tool_start',
      timestamp: new Date().toISOString(),
      data: event,
    });

    this.progress('tool_executing', `Executing ${toolName}...`);
  }

  /**
   * Notify tool execution completed
   */
  toolEnd(
    toolName: string,
    success: boolean,
    durationMs: number,
    result?: unknown
  ): void {
    const event: ToolExecutionEvent = {
      tool_name: toolName,
      success,
      duration_ms: Math.round(durationMs),
    };

    if (result && success) {
      // Include sanitized result summary
      event.result = this.sanitizeResult(result);
    }

    this.emit({
      type: 'tool_end',
      timestamp: new Date().toISOString(),
      data: event,
    });

    const statusMessage = success
      ? `✓ ${toolName} completed (${Math.round(durationMs)}ms)`
      : `✗ ${toolName} failed`;

    this.progress(success ? 'tool_success' : 'tool_error', statusMessage);
  }

  /**
   * Notify agent handoff (orchestrator routing)
   */
  handoff(fromAgent: string, toAgent: string, reason?: string): void {
    const event: HandoffEvent = {
      from_agent: fromAgent,
      to_agent: toAgent,
    };

    if (reason) {
      event.reason = reason;
    }

    this.emit({
      type: 'handoff',
      timestamp: new Date().toISOString(),
      data: event,
    });

    this.progress('handoff', `Routing from ${fromAgent} to ${toAgent}...`);
  }

  /**
   * Send a content delta (streaming text)
   */
  delta(content: string): void {
    this.emit({
      type: 'delta',
      timestamp: new Date().toISOString(),
      data: { content, done: false },
    });
  }

  /**
   * Send final response
   */
  done(content: string, metadata?: Record<string, unknown>): void {
    const totalDurationMs = Date.now() - this.startTime;

    this.emit({
      type: 'done',
      timestamp: new Date().toISOString(),
      data: {
        content,
        done: true,
        duration_ms: totalDurationMs,
        ...metadata,
      },
    });
  }

  /**
   * Send error event
   */
  error(error: string, details?: Record<string, unknown>): void {
    this.emit({
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        error,
        ...details,
      },
    });
  }

  /**
   * Close the stream
   */
  close(): void {
    this.controller.close();
  }

  /**
   * Sanitize parameters to remove sensitive data
   */
  private sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'auth'];

    for (const [key, value] of Object.entries(params)) {
      const keyLower = key.toLowerCase();

      // Check if key contains sensitive terms
      if (sensitiveKeys.some(term => keyLower.includes(term))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate long strings
        sanitized[key] = value.substring(0, 100) + '...';
      } else if (Array.isArray(value) && value.length > 10) {
        // Truncate long arrays
        sanitized[key] = `[Array(${value.length})]`;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize result to create a brief summary
   */
  private sanitizeResult(result: unknown): unknown {
    if (typeof result === 'string') {
      // Parse JSON strings
      try {
        const parsed = JSON.parse(result);
        return this.sanitizeResult(parsed);
      } catch {
        // Not JSON, truncate if too long
        return result.length > 200 ? result.substring(0, 200) + '...' : result;
      }
    }

    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;

      // Return summary fields only
      const summary: Record<string, unknown> = {};

      // Common success indicators
      if ('ok' in obj) summary['ok'] = obj['ok'];
      if ('success' in obj) summary['success'] = obj['success'];
      if ('error' in obj) summary['error'] = obj['error'];

      // Count fields
      if ('count' in obj) summary['count'] = obj['count'];
      if ('length' in obj) summary['length'] = obj['length'];
      if ('results' in obj && Array.isArray(obj['results'])) {
        summary['results_count'] = obj['results'].length;
      }
      if ('entities' in obj && Array.isArray(obj['entities'])) {
        summary['entities_count'] = obj['entities'].length;
      }

      // Message fields
      if ('message' in obj) summary['message'] = obj['message'];

      return summary;
    }

    return result;
  }
}

/**
 * Tool execution wrapper that emits progress events
 */
export async function executeToolWithProgress(
  emitter: ProgressEmitter,
  toolName: string,
  toolFunction: () => Promise<unknown>,
  parameters?: Record<string, unknown>,
  description?: string
): Promise<unknown> {
  const startTime = Date.now();

  try {
    // Emit tool start event
    emitter.toolStart(toolName, parameters, description);

    // Execute tool
    const result = await toolFunction();

    // Emit tool end event
    const duration = Date.now() - startTime;
    emitter.toolEnd(toolName, true, duration, result);

    return result;
  } catch (error: unknown) {
    // Emit tool failure event
    const duration = Date.now() - startTime;
    emitter.toolEnd(toolName, false, duration);

    // Re-throw error for agent to handle
    throw error;
  }
}

/**
 * Example usage in agent route:
 *
 * ```typescript
 * const stream = new ReadableStream({
 *   async start(controller) {
 *     const emitter = new ProgressEmitter(controller);
 *
 *     // Send metadata
 *     emitter.metadata({
 *       model: 'gpt-5-mini',
 *       complexity: 'moderate',
 *       tools: ['ha_search', 'memory_search'],
 *     });
 *
 *     // Tool execution with progress
 *     await executeToolWithProgress(
 *       emitter,
 *       'ha_search',
 *       async () => haSearch.execute({ query: 'lights' }),
 *       { query: 'lights' },
 *       'Search Home Assistant entities'
 *     );
 *
 *     // Agent handoff
 *     emitter.handoff('Orchestrator', 'Home Specialist', 'Home automation query');
 *
 *     // Stream response
 *     for (const chunk of responseChunks) {
 *       emitter.delta(chunk);
 *     }
 *
 *     // Done
 *     emitter.done(fullResponse, { model: 'gpt-5-mini' });
 *     emitter.close();
 *   }
 * });
 * ```
 */
