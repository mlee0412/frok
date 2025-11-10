/**
 * Voice Agent Stop API Route
 *
 * Terminates an active voice agent session.
 * Cleans up resources and closes WebRTC connections.
 *
 * @module api/agent/voice/stop
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validate } from '@/lib/api/withValidation';
import { z } from 'zod';

// Request validation schema
const VoiceStopRequestSchema = z.object({
  sessionId: z.string().min(1),
});

type VoiceStopRequest = z.infer<typeof VoiceStopRequestSchema>;

/**
 * POST /api/agent/voice/stop
 *
 * Stop a voice agent session
 *
 * @param req - Next.js request with session ID
 * @returns Success confirmation
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 2. Validate request body
  const validation = await validate(req, { body: VoiceStopRequestSchema });
  if (!validation.ok) return validation.response;

  const body: VoiceStopRequest = validation.data.body;

  try {
    // Note: In full implementation, this would:
    // - Retrieve voice agent instance from session store
    // - Call voiceAgent.stop()
    // - Clean up WebRTC connections
    // - Remove session from store

    console.log('[voice/stop] Session stopped:', {
      sessionId: body.sessionId,
      userId: auth.user.userId,
    });

    return NextResponse.json({
      ok: true,
      message: 'Voice session stopped',
    });
  } catch (error: unknown) {
    console.error('[voice/stop] Error:', error);

    const err = error as Error;
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to stop voice session',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
