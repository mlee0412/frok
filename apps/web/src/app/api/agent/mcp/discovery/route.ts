/**
 * MCP Discovery API Route
 *
 * Discovers available Home Assistant devices and generates MCP tools dynamically.
 * Provides auto-discovery of entities and actions.
 *
 * POST /api/agent/mcp/discovery
 * - Requires authentication
 * - Returns discovered MCP tools
 *
 * Phase 3.1: MCP Integration for Home Assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { errorHandler } from '@/lib/errorHandler';
import {
  createHomeAssistantMCP,
  getDefaultMCPConfig,
  validateMCPConfig,
  type MCPToolConfig,
} from '@/lib/agent/mcpIntegration';

/**
 * Discover available MCP tools from Home Assistant
 */
export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.standard);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    // 3. Parse request body
    const body = await req.json();
    const config: Partial<MCPToolConfig> = body.config ?? getDefaultMCPConfig();

    // 4. Validate configuration
    const validation = validateMCPConfig(config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid MCP configuration',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // 5. Check Home Assistant credentials
    const haUrl = process.env['HOME_ASSISTANT_URL'];
    const haToken = process.env['HOME_ASSISTANT_TOKEN'];

    if (!haUrl || !haToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Home Assistant credentials not configured',
          details: [
            'HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables are required',
          ],
        },
        { status: 503 }
      );
    }

    // 6. Create MCP client and discover tools
    const mcpClient = createHomeAssistantMCP(haUrl, haToken);
    const tools = await mcpClient.discoverTools(config as MCPToolConfig);

    // 7. Return discovered tools with metadata
    return NextResponse.json({
      ok: true,
      data: {
        toolCount: tools.length,
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          domain: t.domain,
          entityId: t.entityId,
          actions: t.actions,
        })),
        config,
        discoveredAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high' as const,
      context: {
        route: '/api/agent/mcp/discovery',
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to discover MCP tools',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Clear MCP tool cache (force rediscovery)
 */
export async function DELETE(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.standard);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    // Check Home Assistant credentials
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

    // Create MCP client and clear cache
    const mcpClient = createHomeAssistantMCP(haUrl, haToken);
    mcpClient.clearCache();

    return NextResponse.json({
      ok: true,
      message: 'MCP tool cache cleared successfully',
    });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high' as const,
      context: {
        route: '/api/agent/mcp/discovery',
        userId: auth.user.userId,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to clear MCP cache',
      },
      { status: 500 }
    );
  }
}
