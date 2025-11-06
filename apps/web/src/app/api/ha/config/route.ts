import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';

function getHA() {
  const base = (process.env['HOME_ASSISTANT_URL'] || process.env['HA_BASE_URL'] || '').trim();
  const token = (process.env['HOME_ASSISTANT_TOKEN'] || process.env['HA_TOKEN'] || '').trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

/**
 * GET /api/ha/config
 *
 * Returns Home Assistant configuration (base URL and access token) for WebSocket connection.
 * This route is secured with authentication and rate limiting.
 */
export async function GET(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.read);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  const ha = getHA();
  if (!ha) {
    return NextResponse.json(
      { ok: false, error: 'home_assistant_not_configured' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    baseUrl: ha.base,
    token: ha.token,
  });
}
