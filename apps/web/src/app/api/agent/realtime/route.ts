/**
 * Realtime Agent API Route
 *
 * Provides WebSocket-based real-time voice interaction endpoints.
 * Supports session initialization, connection management, and cleanup.
 *
 * POST /api/agent/realtime/init - Initialize new realtime session
 * POST /api/agent/realtime/connect - Get connection details for session
 * DELETE /api/agent/realtime/:sessionId - Terminate active session
 * GET /api/agent/realtime/sessions - List user's active sessions
 *
 * Phase 4: Realtime Agents Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validate } from '@/lib/api/withValidation';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { errorHandler } from '@/lib/errorHandler';
import {
  initializeRealtimeSession,
  terminateRealtimeSession,
  getUserSessions,
  getRealtimeSession,
  getDefaultRealtimeConfig,
  validateRealtimeConfig,
} from '@/lib/agent/realtimeAgent';
import { z } from 'zod';

// Validation schema for realtime session initialization
const InitializeSessionSchema = z.object({
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
  vadEnabled: z.boolean().optional(),
  turnDetection: z.enum(['aggressive', 'standard', 'none']).optional(),
  transport: z.enum(['webrtc', 'websocket']).optional(),
  enableSpecialistTools: z.boolean().optional(),
});

// Validation schema for session connection
const ConnectSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * Initialize a new realtime session
 *
 * Creates a new RealtimeSession with specified configuration.
 * Returns session metadata including sessionId for connection.
 */
export async function POST(req: NextRequest) {
  // 1. Rate limiting (AI routes have strict limits)
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.ai);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Validation
  const validated = await validate(req, { body: InitializeSessionSchema });
  if (!validated.ok) return validated.response;

  try {
    // 4. Build configuration
    const config = {
      userId: auth.user.userId,
      voice: validated.data.body.voice,
      vadEnabled: validated.data.body.vadEnabled,
      turnDetection: validated.data.body.turnDetection,
      transport: validated.data.body.transport,
      enableSpecialistTools: validated.data.body.enableSpecialistTools,
    };

    // 5. Validate configuration
    const validation = validateRealtimeConfig(config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid configuration',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // 6. Initialize session
    const metadata = initializeRealtimeSession(config);

    // 7. Return session details
    return NextResponse.json({
      ok: true,
      data: {
        sessionId: metadata.sessionId,
        voice: metadata.voice,
        transport: metadata.transport,
        vadEnabled: metadata.vadEnabled,
        specialistTools: metadata.specialistTools,
        createdAt: metadata.createdAt,
        // Note: Actual WebSocket connection requires client-side setup
        // using OpenAI Realtime API with the sessionId
        instructions: {
          websocket: 'Use OpenAI Realtime API client with this sessionId',
          webrtc: 'Use WebRTC transport with this sessionId for browser',
        },
      },
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high' as const,
      context: {
        route: '/api/agent/realtime',
        method: 'POST',
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to initialize realtime session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get user's active realtime sessions
 *
 * Returns list of all active sessions for the authenticated user.
 */
export async function GET(req: NextRequest) {
  // 1. Rate limiting (read operations)
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.read);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    // 3. Get user's sessions
    const sessions = getUserSessions(auth.user.userId);

    // 4. Return sessions
    return NextResponse.json({
      ok: true,
      data: {
        sessions,
        count: sessions.length,
      },
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'low' as const,
      context: {
        route: '/api/agent/realtime',
        method: 'GET',
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to get sessions',
      },
      { status: 500 }
    );
  }
}

/**
 * Terminate a realtime session
 *
 * Disconnects the session and removes it from active sessions.
 */
export async function DELETE(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.standard);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Validation
  const validated = await validate(req, { body: ConnectSessionSchema });
  if (!validated.ok) return validated.response;

  try {
    const { sessionId } = validated.data.body;

    // 4. Verify session ownership
    const sessionData = getRealtimeSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    if (sessionData.metadata.userId !== auth.user.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Unauthorized access to session',
        },
        { status: 403 }
      );
    }

    // 5. Terminate session
    const success = await terminateRealtimeSession(sessionId);

    if (!success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to terminate session',
        },
        { status: 500 }
      );
    }

    // 6. Return success
    return NextResponse.json({
      ok: true,
      data: {
        sessionId,
        terminated: true,
      },
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'medium' as const,
      context: {
        route: '/api/agent/realtime',
        method: 'DELETE',
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to terminate session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
