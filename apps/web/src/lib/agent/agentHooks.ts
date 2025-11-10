/**
 * FROK Agent Lifecycle Hooks
 *
 * Provides observability, cost tracking, and performance monitoring
 * for OpenAI Agents SDK through lifecycle hooks.
 *
 * Features:
 * - Agent execution tracking
 * - Tool usage monitoring and cost attribution
 * - Performance metrics (latency, duration)
 * - Error tracking and debugging
 */

import type { Agent } from '@openai/agents';
import { errorHandler } from '@/lib/errorHandler';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface ToolUsageLog {
  tool: string;
  agentName: string;
  userId: string;
  durationMs: number;
  estimatedCost: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface AgentExecutionLog {
  agentName: string;
  userId: string;
  durationMs: number;
  tokensUsed?: number;
  estimatedCost: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface AgentHooksConfig {
  beforeRun?: (context: {
    agent: Agent;
    input: unknown;
    context: Map<string, unknown>;
  }) => Promise<void>;
  afterRun?: (context: {
    agent: Agent;
    result: {
      content?: { text?: string };
      usage?: { totalTokens?: number };
    };
    context: Map<string, unknown>;
  }) => Promise<void>;
  beforeToolCall?: (context: {
    agent: Agent;
    toolCall: { name: string; arguments?: string };
    context: Map<string, unknown>;
  }) => Promise<void>;
  afterToolCall?: (context: {
    agent: Agent;
    toolCall: { name: string };
    result: unknown;
    context: Map<string, unknown>;
  }) => Promise<void>;
  beforeHandoff?: (context: {
    fromAgent: Agent;
    toAgent: Agent;
    context: Map<string, unknown>;
  }) => Promise<void>;
}

// ============================================================================
// Cost Estimation
// ============================================================================

/**
 * Estimates cost for built-in OpenAI tools
 * Based on OpenAI pricing as of 2025-01
 */
function estimateToolCost(toolName: string): number {
  const costs: Record<string, number> = {
    // Built-in OpenAI tools
    code_interpreter: 0.03, // $0.03 per session
    file_search: 0.001, // $0.10/GB/day ≈ $0.001 per query
    image_generation: 0.04, // $0.040 per 1024x1024 image
    web_search: 0.0, // Free (OpenAI managed)
    computer_use: 0.01, // Experimental, estimated
    hosted_mcp: 0.005, // Experimental, estimated

    // Custom tools (free, but track usage)
    ha_search: 0.0,
    ha_call: 0.0,
    memory_add: 0.0,
    memory_search: 0.0,
    custom_web_search: 0.0,
  };

  return costs[toolName] ?? 0.0;
}

/**
 * Estimates cost based on token usage
 * GPT-5 pricing: $0.015/1K input, $0.06/1K output (average $0.0375/1K)
 */
function estimateTokenCost(tokensUsed: number): number {
  const avgCostPer1KTokens = 0.0375;
  return (tokensUsed / 1000) * avgCostPer1KTokens;
}

// ============================================================================
// Hook State Management
// ============================================================================

class HookState {
  private sessionStartTime: number = 0;
  private toolStartTimes: Map<string, number> = new Map();
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  setSessionStart(time: number) {
    this.sessionStartTime = time;
  }

  getSessionStart(): number {
    return this.sessionStartTime;
  }

  setToolStart(toolName: string, time: number) {
    this.toolStartTimes.set(toolName, time);
  }

  getToolStart(toolName: string): number {
    return this.toolStartTimes.get(toolName) ?? performance.now();
  }

  deleteToolStart(toolName: string) {
    this.toolStartTimes.delete(toolName);
  }

  getUserId(): string {
    return this.userId;
  }

  async logToolUsage(log: ToolUsageLog): Promise<void> {
    try {
      // Console logging in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ToolUsage]', {
          tool: log.tool,
          agent: log.agentName,
          duration: `${Math.round(log.durationMs)}ms`,
          cost: `$${log.estimatedCost.toFixed(4)}`,
        });
      }

      // Store in Supabase (uses admin client to bypass RLS in server context)
      const supabase = getSupabaseAdmin();
      const { error: dbError } = await supabase.from('tool_usage_logs').insert({
        user_id: log.userId,
        agent_name: log.agentName,
        tool_name: log.tool,
        duration_ms: Math.round(log.durationMs),
        estimated_cost: log.estimatedCost,
        success: log.success,
        error: log.error,
      });

      if (dbError) {
        throw dbError;
      }
    } catch (error) {
      errorHandler.logError({
        message: 'Failed to log tool usage',
        severity: 'low',
        context: { log, error },
      });
    }
  }

  async logAgentExecution(log: AgentExecutionLog): Promise<void> {
    try {
      // Console logging in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('[AgentExecution]', {
          agent: log.agentName,
          duration: `${Math.round(log.durationMs)}ms`,
          tokens: log.tokensUsed,
          cost: `$${log.estimatedCost.toFixed(4)}`,
        });
      }

      // Store in Supabase (uses admin client to bypass RLS in server context)
      const supabase = getSupabaseAdmin();
      const { error: dbError } = await supabase.from('agent_execution_logs').insert({
        user_id: log.userId,
        agent_name: log.agentName,
        duration_ms: Math.round(log.durationMs),
        tokens_used: log.tokensUsed ?? null,
        estimated_cost: log.estimatedCost,
        success: log.success,
        error: log.error,
      });

      if (dbError) {
        throw dbError;
      }
    } catch (error) {
      errorHandler.logError({
        message: 'Failed to log agent execution',
        severity: 'low',
        context: { log, error },
      });
    }
  }
}

// ============================================================================
// FROK Agent Hooks Factory
// ============================================================================

/**
 * Creates AgentHooks configuration for FROK agents
 */
export function createFROKAgentHooks(userId: string): AgentHooksConfig {
  const state = new HookState(userId);

  return {
    /**
     * Called before agent starts processing
     */
    beforeRun: async (context) => {
      state.setSessionStart(performance.now());

      console.log('[AgentHooks] Agent started:', {
        agentName: context.agent.name,
        userId: state.getUserId(),
        timestamp: new Date().toISOString(),
      });

      // Store start time in context for duration tracking
      context.context.set('sessionStartTime', state.getSessionStart());
    },

    /**
     * Called after agent completes processing
     */
    afterRun: async (context) => {
      const duration = performance.now() - state.getSessionStart();
      const tokensUsed = context.result.usage?.totalTokens ?? 0;
      const cost = estimateTokenCost(tokensUsed);

      console.log('[AgentHooks] Agent completed:', {
        agentName: context.agent.name,
        durationMs: Math.round(duration),
        tokensUsed,
        estimatedCost: `$${cost.toFixed(4)}`,
      });

      // Log execution for analytics
      await state.logAgentExecution({
        agentName: context.agent.name,
        userId: state.getUserId(),
        durationMs: duration,
        tokensUsed,
        estimatedCost: cost,
        timestamp: new Date(),
        success: true,
      });
    },

    /**
     * Called before a tool is executed
     */
    beforeToolCall: async (context) => {
      state.setToolStart(context.toolCall.name, performance.now());

      console.log('[AgentHooks] Tool called:', {
        tool: context.toolCall.name,
        agentName: context.agent.name,
        args: context.toolCall.arguments,
      });
    },

    /**
     * Called after a tool completes execution
     */
    afterToolCall: async (context) => {
      const duration = performance.now() - state.getToolStart(context.toolCall.name);
      const cost = estimateToolCost(context.toolCall.name);

      console.log('[AgentHooks] Tool completed:', {
        tool: context.toolCall.name,
        durationMs: Math.round(duration),
        estimatedCost: `$${cost.toFixed(4)}`,
      });

      // Log tool usage for analytics
      await state.logToolUsage({
        tool: context.toolCall.name,
        agentName: context.agent.name,
        userId: state.getUserId(),
        durationMs: duration,
        estimatedCost: cost,
        timestamp: new Date(),
        success: true,
      });

      // Cleanup
      state.deleteToolStart(context.toolCall.name);
    },

    /**
     * Called before handoff to another agent
     */
    beforeHandoff: async (context) => {
      console.log('[AgentHooks] Handoff:', {
        from: context.fromAgent.name,
        to: context.toAgent.name,
        userId: state.getUserId(),
      });
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { Agent } from '@openai/agents';
