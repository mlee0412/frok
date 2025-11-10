/**
 * Voice Agent Start API Route
 *
 * Initiates a voice agent session for hands-free interactions.
 * Creates a session ID that the frontend uses for WebRTC connection.
 *
 * @module api/agent/voice/start
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validate } from '@/lib/api/withValidation';
import { createEnhancedAgentSuite } from '@/lib/agent/orchestrator-enhanced';
import { createVoiceAgent, validateVoiceConfig } from '@/lib/agent/voiceAgent';
import type { VoiceAgentConfig } from '@/lib/agent/voiceAgent';
import { z } from 'zod';

// Request validation schema
const VoiceStartRequestSchema = z.object({
  config: z.object({
    ttsVoice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
    sttEnabled: z.boolean().optional(),
    vadEnabled: z.boolean().optional(),
    language: z.string().optional(),
  }).optional(),
});

type VoiceStartRequest = z.infer<typeof VoiceStartRequestSchema>;

/**
 * POST /api/agent/voice/start
 *
 * Start a voice agent session
 *
 * @param req - Next.js request with voice config
 * @returns Session ID for WebRTC connection
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 2. Validate request body
  const validation = await validate(req, { body: VoiceStartRequestSchema });
  if (!validation.ok) return validation.response;

  const body: VoiceStartRequest = validation.data.body;

  try {
    // 3. Prepare voice config
    const voiceConfig: VoiceAgentConfig = {
      userId: auth.user.userId,
      ttsVoice: body.config?.ttsVoice ?? 'alloy',
      sttEnabled: body.config?.sttEnabled ?? true,
      vadEnabled: body.config?.vadEnabled ?? true,
      language: body.config?.language ?? 'en',
    };

    // 4. Validate voice config
    const validation = validateVoiceConfig(voiceConfig);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid voice configuration',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // 5. Create agent suite
    const agentSuite = await createEnhancedAgentSuite({
      userId: auth.user.userId,
    });

    // 6. Create voice agent
    const voiceAgent = createVoiceAgent(agentSuite, voiceConfig);

    // 7. Start voice session
    const sessionId = await voiceAgent.start();

    console.log('[voice/start] Session started:', {
      sessionId,
      userId: auth.user.userId,
      voice: voiceConfig.ttsVoice,
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      config: voiceConfig,
    });
  } catch (error: unknown) {
    console.error('[voice/start] Error:', error);

    const err = error as Error;
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to start voice session',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
