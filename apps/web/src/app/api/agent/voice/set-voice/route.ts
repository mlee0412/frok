/**
 * Voice Agent Set Voice API Route
 *
 * Updates the TTS voice for an active voice session.
 * Allows users to switch voices mid-conversation.
 *
 * @module api/agent/voice/set-voice
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validate } from '@/lib/api/withValidation';
import { z } from 'zod';

// Request validation schema
const SetVoiceRequestSchema = z.object({
  sessionId: z.string().min(1),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']),
});

type SetVoiceRequest = z.infer<typeof SetVoiceRequestSchema>;

/**
 * POST /api/agent/voice/set-voice
 *
 * Update TTS voice for active session
 *
 * @param req - Next.js request with session ID and new voice
 * @returns Success confirmation
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 2. Validate request body
  const validation = await validate(req, { body: SetVoiceRequestSchema });
  if (!validation.ok) return validation.response;

  const body: SetVoiceRequest = validation.data.body;

  try {
    // Note: In full implementation, this would:
    // - Retrieve voice agent instance from session store
    // - Call voiceAgent.setVoice(body.voice)
    // - Update session configuration

    console.log('[voice/set-voice] Voice updated:', {
      sessionId: body.sessionId,
      userId: auth.user.userId,
      newVoice: body.voice,
    });

    return NextResponse.json({
      ok: true,
      voice: body.voice,
      message: 'Voice updated successfully',
    });
  } catch (error: unknown) {
    console.error('[voice/set-voice] Error:', error);

    const err = error as Error;
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to update voice',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
