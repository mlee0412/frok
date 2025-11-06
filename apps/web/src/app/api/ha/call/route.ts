import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateBody } from '@/lib/api/withValidation';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { HAServiceCallSchema } from '@/schemas';

function getHA() {
  const base = (process.env["HOME_ASSISTANT_URL"] || process.env["HA_BASE_URL"] || '').trim();
  const token = (process.env["HOME_ASSISTANT_TOKEN"] || process.env["HA_TOKEN"] || '').trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.standard);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Validation
  const validated = await validateBody(req, HAServiceCallSchema);
  if (!validated.ok) return validated.response;

  const ha = getHA();
  if (!ha) return NextResponse.json({ ok: false, error: 'missing_home_assistant_env' }, { status: 400 });

  const { domain, service, entity_id, area_id, target, data = {} } = validated.data;

  try {
    const payload: Record<string, unknown> = { ...data } as Record<string, unknown>;
    if (entity_id) payload['entity_id'] = entity_id;
    if (area_id) payload['area_id'] = area_id;
    if (target) payload['target'] = target;

    const r = await fetch(`${ha.base}/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ ok: false, error: `ha_status_${r.status}`, detail: text }, { status: r.status });
    }

    const result = await r.json().catch(() => null);
    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: 'exception', detail: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, hint: 'POST { domain, service, entity_id?, area_id?, target?, data? } to call HA service' },
    { status: 200 }
  );
}
