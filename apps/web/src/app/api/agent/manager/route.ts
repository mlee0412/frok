/**
 * Manager Pattern API Route
 *
 * Provides access to the manager pattern (agents-as-tools) where the orchestrator
 * uses specialist agents as tools while maintaining control of the conversation.
 *
 * POST /api/agent/manager
 * - Requires authentication
 * - Executes manager pattern with specialist synthesis
 * - Returns coordinated response from multiple specialists
 *
 * Phase 4: Advanced Multi-Agent Patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validate } from '@/lib/api/withValidation';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { errorHandler } from '@/lib/errorHandler';
import {
  createManagerPattern,
  getDefaultManagerConfig,
} from '@/lib/agent/managerPattern';
import { z } from 'zod';

// Validation schema for manager pattern request
const ManagerRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  enabledSpecialists: z
    .array(z.enum(['home', 'memory', 'research', 'code', 'general']))
    .optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional(),
});

/**
 * Execute manager pattern query
 *
 * Uses specialist agents as tools, manager maintains control and synthesizes
 * the final response from specialist outputs.
 */
export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.standard);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Validation
  const validated = await validate(req, { body: ManagerRequestSchema });
  if (!validated.ok) return validated.response;

  try {
    // 4. Create manager pattern configuration
    const config = getDefaultManagerConfig(auth.user.userId);

    // Override with user-specified specialists if provided
    if (validated.data.body.enabledSpecialists) {
      config.enabledSpecialists = validated.data.body.enabledSpecialists;
    }

    // 5. Create manager pattern
    const { manager, specialistTools } = await createManagerPattern(config);

    // 6. Build input with conversation history if provided
    let input = validated.data.body.query;
    if (validated.data.body.conversationHistory && validated.data.body.conversationHistory.length > 0) {
      const historyText = validated.data.body.conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');
      input = `Previous conversation:\n${historyText}\n\nCurrent query: ${input}`;
    }

    // 7. Execute manager agent
    const startTime = Date.now();
    const result = await manager.run(input);
    const duration = Date.now() - startTime;

    // 8. Extract which specialists were called from result
    const specialistsUsed: string[] = [];
    if (result.messages) {
      for (const message of result.messages) {
        if (message.role === 'tool' && message.name) {
          // Extract specialist name from tool name (e.g., "call_home_specialist" -> "home")
          const match = message.name.match(/call_(\w+)_specialist/);
          if (match && match[1]) {
            specialistsUsed.push(match[1]);
          }
        }
      }
    }

    // 9. Return manager response with metadata
    return NextResponse.json({
      ok: true,
      data: {
        response: result.finalOutput,
        pattern: 'manager',
        specialistsAvailable: specialistTools.map((t) => t.specialist),
        specialistsUsed: [...new Set(specialistsUsed)], // Deduplicate
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high' as const,
      context: {
        route: '/api/agent/manager',
        userId: auth.user.userId,
        query: validated.data.body.query,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to execute manager pattern',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get manager pattern configuration and available specialists
 */
export async function GET(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.read);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    // 3. Return configuration information
    return NextResponse.json({
      ok: true,
      data: {
        pattern: 'manager',
        description:
          'Manager pattern uses specialist agents as tools while maintaining control. The manager synthesizes multiple specialist perspectives into a unified response.',
        specialists: [
          {
            name: 'home',
            description: 'Smart home device control and automation',
            capabilities: ['device_control', 'automation', 'state_queries'],
          },
          {
            name: 'memory',
            description: 'User preferences and long-term context',
            capabilities: ['preference_recall', 'habit_tracking', 'context_memory'],
          },
          {
            name: 'research',
            description: 'Web research and current information',
            capabilities: ['web_search', 'fact_checking', 'news_gathering'],
          },
          {
            name: 'code',
            description: 'Code execution and data analysis',
            capabilities: ['python_execution', 'calculations', 'data_processing'],
          },
          {
            name: 'general',
            description: 'Complex multi-domain reasoning',
            capabilities: ['reasoning', 'problem_solving', 'synthesis'],
          },
        ],
        usage: {
          endpoint: 'POST /api/agent/manager',
          parameters: {
            query: 'string (required)',
            enabledSpecialists: 'array of specialist names (optional)',
            conversationHistory: 'array of message objects (optional)',
          },
        },
      },
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'low' as const,
      context: {
        route: '/api/agent/manager',
        method: 'GET',
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to get manager configuration',
      },
      { status: 500 }
    );
  }
}
