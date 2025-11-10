/**
 * MCP State Query API Route
 *
 * Queries the current state of Home Assistant entities.
 * Provides real-time device state information.
 *
 * POST /api/agent/mcp/state
 * - Requires authentication
 * - Returns entity state information
 *
 * Phase 3.1: MCP Integration for Home Assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validate } from '@/lib/api/withValidation';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { errorHandler } from '@/lib/errorHandler';
import { createHomeAssistantMCP } from '@/lib/agent/mcpIntegration';
import { z } from 'zod';

// Validation schema for state query
const StateQuerySchema = z.object({
  entityId: z.string().min(1, 'Entity ID is required'),
});

/**
 * Get current state of a Home Assistant entity
 */
export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.read);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Validation
  const validated = await validate(req, { body: StateQuerySchema });
  if (!validated.ok) return validated.response;

  try {
    // 4. Check Home Assistant credentials
    const haUrl = process.env['HOME_ASSISTANT_URL'];
    const haToken = process.env['HOME_ASSISTANT_TOKEN'];

    if (!haUrl || !haToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Home Assistant credentials not configured',
        },
        { status: 503 }
      );
    }

    // 5. Query entity state
    const mcpClient = createHomeAssistantMCP(haUrl, haToken);
    const state = await mcpClient.getState(validated.data.body.entityId);

    // 6. Return state information
    return NextResponse.json({
      ok: true,
      data: {
        entityId: state.entity_id,
        state: state.state,
        attributes: state.attributes,
        lastChanged: state.last_changed,
        lastUpdated: state.last_updated,
        queriedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high' as const,
      context: {
        route: '/api/agent/mcp/state',
        userId: auth.user.userId,
        entityId: validated.data.body.entityId,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to query entity state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
