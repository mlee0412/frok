/**
 * Realtime Agent Implementation for OpenAI Agents SDK
 *
 * Implements WebSocket-based real-time voice interactions using OpenAI's Realtime API.
 * Provides low-latency bidirectional communication for voice conversations.
 *
 * Features:
 * - WebSocket transport for real-time communication
 * - Voice activity detection (VAD)
 * - Audio interruption handling
 * - Multi-agent handoffs in real-time sessions
 * - Tool execution in voice context
 *
 * Phase 4: Realtime Agents Implementation
 *
 * @module realtimeAgent
 * @see apps/web/src/app/api/agent/realtime/route.ts
 */

import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
import type { RealtimeSessionConfig } from '@openai/agents/realtime';
import { z } from 'zod';
import { createEnhancedAgentSuite } from './orchestrator-enhanced';

// ============================================================================
// Types
// ============================================================================

/**
 * Realtime agent configuration
 */
export interface RealtimeAgentConfig {
  /**
   * User ID for session management
   */
  userId: string;

  /**
   * Voice model to use (alloy, echo, fable, onyx, nova, shimmer)
   */
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

  /**
   * Enable voice activity detection
   */
  vadEnabled?: boolean;

  /**
   * Turn detection mode
   */
  turnDetection?: 'aggressive' | 'standard' | 'none';

  /**
   * Transport type (webrtc for browser, websocket for server)
   */
  transport?: 'webrtc' | 'websocket';

  /**
   * Enable specialist tools
   */
  enableSpecialistTools?: boolean;
}

/**
 * Realtime session metadata
 */
export interface RealtimeSessionMetadata {
  sessionId: string;
  userId: string;
  voice: string;
  transport: string;
  vadEnabled: boolean;
  createdAt: string;
  specialistTools: string[];
}

// ============================================================================
// Specialist Tools for Realtime Context
// ============================================================================

/**
 * Create tools suitable for realtime voice interaction
 *
 * Tools must be fast-executing and suitable for browser context
 * Avoid long-running operations or sensitive server-side actions
 */
function createRealtimeTools() {
  const tools = [];

  // Weather checking tool (example)
  tools.push(
    tool({
      name: 'check_weather',
      description: 'Check current weather for a city',
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => {
        // In production, call actual weather API
        // For now, return mock data
        return `The weather in ${city} is sunny and 22°C with light winds`;
      },
    })
  );

  // Quick calculation tool
  tools.push(
    tool({
      name: 'calculate',
      description: 'Perform basic math calculations',
      parameters: z.object({
        expression: z.string().describe('Math expression to evaluate (e.g., "2 + 2")'),
      }),
      execute: async ({ expression }) => {
        try {
          // Safe eval for simple math expressions
          const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
          const result = eval(sanitized);
          return `The result is ${result}`;
        } catch (error: unknown) {
          return `Sorry, I couldn't calculate that: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Memory recall tool (fast lookup)
  tools.push(
    tool({
      name: 'recall_preference',
      description: 'Quickly recall user preferences or past information',
      parameters: z.object({
        topic: z.string().describe('What preference or information to recall'),
      }),
      execute: async ({ topic }) => {
        // In production, query memory store
        return `I found that your ${topic} preference is set. Let me use that context.`;
      },
    })
  );

  return tools;
}

// ============================================================================
// Realtime Agent Creation
// ============================================================================

/**
 * Create a realtime voice agent
 *
 * Creates an agent optimized for real-time voice interactions with
 * automatic audio I/O, voice activity detection, and fast tool execution.
 *
 * @param config - Realtime agent configuration
 * @returns Realtime agent instance
 */
export function createRealtimeAgent(config: RealtimeAgentConfig): RealtimeAgent {
  const tools = config.enableSpecialistTools ? createRealtimeTools() : [];

  const agent = new RealtimeAgent({
    name: 'FROK Realtime Assistant',
    instructions:
      'You are a friendly, concise voice assistant.\n\n' +
      'Guidelines:\n' +
      '- Keep responses brief and conversational (voice context)\n' +
      '- Use natural language without complex formatting\n' +
      '- Ask clarifying questions if needed\n' +
      '- Use tools when they can help provide accurate information\n' +
      '- Maintain context from the conversation history\n\n' +
      'Available tools:\n' +
      '- Weather checking for any city\n' +
      '- Quick calculations\n' +
      '- User preference recall\n\n' +
      'Remember: You are in a real-time voice conversation. Be natural and concise.',
    tools,
    voice: config.voice ?? 'alloy',
  });

  return agent;
}

/**
 * Create a realtime session with configuration
 *
 * Sets up a realtime session with WebSocket or WebRTC transport,
 * voice activity detection, and interruption handling.
 *
 * @param agent - Realtime agent instance
 * @param config - Realtime agent configuration
 * @returns Realtime session instance
 */
export function createRealtimeSession(
  agent: RealtimeAgent,
  config: RealtimeAgentConfig
): RealtimeSession {
  const sessionConfig: RealtimeSessionConfig = {
    agent,
    transport: config.transport ?? 'websocket',
    turnDetection: config.vadEnabled
      ? {
          mode: config.turnDetection ?? 'standard',
        }
      : undefined,
  };

  const session = new RealtimeSession(sessionConfig);

  // Set up event handlers for monitoring and debugging
  session.on('connected', () => {
    console.log('[RealtimeSession] Connected', {
      userId: config.userId,
      transport: config.transport,
    });
  });

  session.on('disconnected', () => {
    console.log('[RealtimeSession] Disconnected', {
      userId: config.userId,
    });
  });

  session.on('error', (error) => {
    console.error('[RealtimeSession] Error', {
      userId: config.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  session.on('audio_interrupted', () => {
    console.log('[RealtimeSession] Audio interrupted by user', {
      userId: config.userId,
    });
  });

  session.on('tool.call', (event) => {
    console.log('[RealtimeSession] Tool called', {
      userId: config.userId,
      toolName: event.name,
      args: event.arguments,
    });
  });

  return session;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Active sessions map
 * In production, use Redis or similar for distributed session management
 */
const activeSessions = new Map<string, { session: RealtimeSession; metadata: RealtimeSessionMetadata }>();

/**
 * Initialize a new realtime session
 *
 * Creates a new session and stores it for management.
 * Returns session ID and connection details.
 *
 * @param config - Realtime agent configuration
 * @returns Session metadata
 */
export function initializeRealtimeSession(config: RealtimeAgentConfig): RealtimeSessionMetadata {
  const agent = createRealtimeAgent(config);
  const session = createRealtimeSession(agent, config);

  const sessionId = `rt_${config.userId}_${Date.now()}`;
  const metadata: RealtimeSessionMetadata = {
    sessionId,
    userId: config.userId,
    voice: config.voice ?? 'alloy',
    transport: config.transport ?? 'websocket',
    vadEnabled: config.vadEnabled ?? true,
    createdAt: new Date().toISOString(),
    specialistTools: config.enableSpecialistTools
      ? ['check_weather', 'calculate', 'recall_preference']
      : [],
  };

  activeSessions.set(sessionId, { session, metadata });

  return metadata;
}

/**
 * Get an active realtime session
 *
 * @param sessionId - Session identifier
 * @returns Session and metadata if found
 */
export function getRealtimeSession(sessionId: string): {
  session: RealtimeSession;
  metadata: RealtimeSessionMetadata;
} | null {
  return activeSessions.get(sessionId) ?? null;
}

/**
 * Terminate a realtime session
 *
 * Disconnects the session and removes it from active sessions.
 *
 * @param sessionId - Session identifier
 * @returns Success status
 */
export async function terminateRealtimeSession(sessionId: string): Promise<boolean> {
  const sessionData = activeSessions.get(sessionId);
  if (!sessionData) {
    return false;
  }

  try {
    await sessionData.session.disconnect();
    activeSessions.delete(sessionId);
    return true;
  } catch (error: unknown) {
    console.error('[RealtimeSession] Error terminating session', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get all active sessions for a user
 *
 * @param userId - User identifier
 * @returns Array of session metadata
 */
export function getUserSessions(userId: string): RealtimeSessionMetadata[] {
  const sessions: RealtimeSessionMetadata[] = [];

  for (const [, sessionData] of activeSessions) {
    if (sessionData.metadata.userId === userId) {
      sessions.push(sessionData.metadata);
    }
  }

  return sessions;
}

/**
 * Clean up stale sessions (older than 1 hour)
 *
 * Should be called periodically to prevent memory leaks
 */
export async function cleanupStaleSessions(): Promise<number> {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  let cleaned = 0;

  for (const [sessionId, sessionData] of activeSessions) {
    const createdAt = new Date(sessionData.metadata.createdAt).getTime();
    if (now - createdAt > oneHour) {
      await terminateRealtimeSession(sessionId);
      cleaned++;
    }
  }

  return cleaned;
}

// ============================================================================
// Handoffs for Realtime Context
// ============================================================================

/**
 * Create realtime agents with handoff support
 *
 * Creates multiple realtime agents that can hand off to each other
 * while maintaining the voice conversation context.
 *
 * @param config - Realtime agent configuration
 * @returns Primary agent with handoff capabilities
 */
export async function createRealtimeWithHandoffs(
  config: RealtimeAgentConfig
): Promise<RealtimeAgent> {
  // Create specialized realtime agents
  const homeAgent = new RealtimeAgent({
    name: 'Home Control Specialist',
    instructions: 'You handle smart home control requests in voice conversations.',
    voice: config.voice ?? 'alloy',
  });

  const researchAgent = new RealtimeAgent({
    name: 'Research Specialist',
    instructions: 'You handle research and information lookup in voice conversations.',
    tools: createRealtimeTools(),
    voice: config.voice ?? 'alloy',
  });

  // Create main agent with handoffs
  const mainAgent = new RealtimeAgent({
    name: 'FROK Realtime Assistant',
    instructions:
      'You are a voice assistant that can delegate to specialists.\n' +
      '- Home requests → Home Control Specialist\n' +
      '- Research requests → Research Specialist\n' +
      'Keep responses natural and conversational.',
    handoffs: [homeAgent, researchAgent],
    voice: config.voice ?? 'alloy',
  });

  return mainAgent;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default realtime configuration
 */
export function getDefaultRealtimeConfig(userId: string): RealtimeAgentConfig {
  return {
    userId,
    voice: 'alloy',
    vadEnabled: true,
    turnDetection: 'standard',
    transport: 'websocket',
    enableSpecialistTools: true,
  };
}

/**
 * Validate realtime configuration
 */
export function validateRealtimeConfig(config: Partial<RealtimeAgentConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.userId) {
    errors.push('userId is required');
  }

  if (config.voice && !['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(config.voice)) {
    errors.push('Invalid voice selection');
  }

  if (config.transport && !['webrtc', 'websocket'].includes(config.transport)) {
    errors.push('Invalid transport type');
  }

  if (config.turnDetection && !['aggressive', 'standard', 'none'].includes(config.turnDetection)) {
    errors.push('Invalid turn detection mode');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
