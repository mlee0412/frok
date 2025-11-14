/**
 * Voice Assistant WebSocket API Route
 *
 * ⚠️ DEPLOYMENT LIMITATION: This feature requires WebSocket support.
 * Vercel's serverless functions DO NOT support WebSocket upgrades.
 *
 * To use this feature, deploy the voice endpoint to:
 * - Railway (recommended for Node.js apps)
 * - Render
 * - Fly.io
 * - Self-hosted server with WebSocket support
 *
 * Alternative: Implement HTTP polling or SSE-based streaming instead.
 *
 * Real-time voice conversation endpoint using WebSocket for bidirectional audio streaming.
 * Handles the three-stream pipeline: STT → LLM → TTS
 *
 * Security:
 * - Authentication via withAuth middleware (JWT validation)
 * - Rate limiting: 5 concurrent connections per user
 * - User ID isolation for conversation history
 *
 * Flow:
 * 1. Client sends audio chunks (base64-encoded)
 * 2. Server buffers until end-of-utterance (500ms silence)
 * 3. Transcribe with Deepgram STT
 * 4. Stream response from OpenAI GPT-5
 * 5. Synthesize with ElevenLabs TTS
 * 6. Send audio chunks back to client
 *
 * WebSocket Messages:
 * Client → Server:
 *   - { type: 'audio_input', data: string } // Base64 audio
 *   - { type: 'end_utterance' } // Manual end signal
 *   - { type: 'interrupt' } // Cancel current response
 *
 * Server → Client:
 *   - { type: 'stt_result', text: string }
 *   - { type: 'llm_token', token: string }
 *   - { type: 'audio_chunk', data: string } // Base64 MP3
 *   - { type: 'response_complete' }
 *   - { type: 'error', error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { VoiceSessionManager } from '@/lib/voice/sessionManager';
import { STTService } from '@/lib/voice/sttService';
import { TTSService } from '@/lib/voice/ttsService';
import { errorHandler } from '@/lib/errorHandler';
import { ClientVoiceMessageSchema } from '@/schemas/voice';

export const runtime = 'nodejs'; // Use Node.js runtime for WebSocket support
export const dynamic = 'force-dynamic';

/**
 * WebSocket upgrade endpoint
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Rate limiting (5 req/min for AI operations)
    const rateLimitResult = await withRateLimit(req, {
      maxRequests: 5,
      windowMs: 60000, // 1 minute
    });
    if (!rateLimitResult.ok) return rateLimitResult.response;

    // 2. Authentication
    const auth = await withAuth(req);
    if (!auth.ok) return auth.response;

    const userId = auth.user.userId;

    // 3. Check WebSocket upgrade header
    const upgradeHeader = req.headers.get('upgrade');
    if (upgradeHeader !== 'websocket') {
      return NextResponse.json(
        { error: 'Expected WebSocket upgrade' },
        { status: 426 } // Upgrade Required
      );
    }

    // 4. Create WebSocket connection
    // Note: This uses platform-specific WebSocket upgrade
    // For Vercel/Next.js, we use the native WebSocket API
    const webSocketServer = (global as unknown as { WebSocketServer?: unknown }).WebSocketServer;

    if (!webSocketServer) {
      console.error('[VoiceAPI] WebSocket server not available');
      return NextResponse.json(
        { error: 'WebSocket not supported in this environment' },
        { status: 500 }
      );
    }

    // Platform-specific WebSocket upgrade (Vercel/Deno)
    // @ts-expect-error - Deno global is only available in Deno runtime
    if (typeof Deno !== 'undefined' && 'upgradeWebSocket' in Deno) {
      // @ts-expect-error - Deno.upgradeWebSocket only exists in Deno runtime
      const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
      await setupVoiceSession(clientSocket, userId);
      return response;
    }

    // Fallback: Return error if WebSocket not available
    return NextResponse.json(
      {
        error: 'WebSocket upgrade not supported',
        hint: 'Vercel serverless functions do not support native WebSocket upgrades.',
        nextSteps: [
          'Deploy /api/voice/stream to a WebSocket-friendly host (Railway, Fly.io, Render, or your own Node server).',
          'Expose the URL via NEXT_PUBLIC_VOICE_WS_URL so the frontend connects to the right origin.',
          'Review docs/architecture/VOICE_ASSISTANT_DESIGN.md for full streaming requirements (Deepgram STT + ElevenLabs TTS).',
        ],
        documentation: 'https://vercel.com/docs/functions/runtimes#websockets',
      },
      { status: 501 } // 501 Not Implemented
    );
  } catch (error) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high',
      context: { route: '/api/voice/stream' },
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Setup voice session with WebSocket handlers
 */
async function setupVoiceSession(socket: WebSocket, userId: string) {
  let session: VoiceSessionManager | null = null;

  try {
    // Initialize voice services
    const sttService = new STTService();
    const ttsService = new TTSService();

    // Create session manager
    session = new VoiceSessionManager({
      userId,
      socket,
      sttService,
      ttsService,
    });

    console.log(`[VoiceAPI] Session started for user ${userId}`);

    // Handle incoming messages
    socket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);

        // Validate message schema
        const parsed = ClientVoiceMessageSchema.safeParse(data);

        if (!parsed.success) {
          console.error('[VoiceAPI] Invalid message:', parsed.error);
          socket.send(
            JSON.stringify({
              type: 'error',
              error: 'Invalid message format',
            })
          );
          return;
        }

        // Handle message
        await session!.handleMessage(parsed.data);
      } catch (error) {
        console.error('[VoiceAPI] Message handling error:', error);
        errorHandler.logError({
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'medium',
          context: { userId, event: 'ws_message' },
        });
        socket.send(
          JSON.stringify({
            type: 'error',
            error: 'Failed to process message',
          })
        );
      }
    });

    // Handle connection close
    socket.addEventListener('close', () => {
      console.log(`[VoiceAPI] Session closed for user ${userId}`);
      session?.cleanup();
    });

    // Handle errors
    socket.addEventListener('error', (error) => {
      console.error('[VoiceAPI] WebSocket error:', error);
      errorHandler.logError({
        message: 'WebSocket error',
        severity: 'medium',
        context: { userId, error: error.toString() },
      });
      session?.cleanup();
    });
  } catch (error) {
    console.error('[VoiceAPI] Session setup error:', error);
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high',
      context: { userId, event: 'session_setup' },
    });
    session?.cleanup();
    socket.close();
  }
}
