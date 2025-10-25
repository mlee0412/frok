import { NextResponse } from 'next/server';

function getHA() {
  const base = (process.env.HOME_ASSISTANT_URL || process.env.HA_BASE_URL || '').trim();
  const token = (process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || '').trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

export async function POST(req: Request) {
  const ha = getHA();
  if (!ha) return NextResponse.json({ ok: false, error: 'missing_home_assistant_env' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const domain = String(body?.domain || '').trim();
  const service = String(body?.service || '').trim();
  if (!domain || !service) {
    return NextResponse.json({ ok: false, error: 'domain_and_service_required' }, { status: 400 });
  }

  const entity_id_raw = body?.entity_id;
  const entity_id = Array.isArray(entity_id_raw)
    ? entity_id_raw.map((e: unknown) => String(e)).filter(Boolean)
    : typeof entity_id_raw === 'string'
      ? entity_id_raw.trim()
      : undefined;

  const area_id_raw = body?.area_id;
  const area_id = Array.isArray(area_id_raw)
    ? area_id_raw.map((a: unknown) => String(a)).filter(Boolean)
    : typeof area_id_raw === 'string'
      ? area_id_raw.trim()
      : undefined;

  const target = body?.target && typeof body.target === 'object' ? body.target : undefined;
  const data = body?.data && typeof body.data === 'object' ? body.data : {};

  try {
    const payload: any = { ...data };
    if (entity_id) payload.entity_id = entity_id;
    if (area_id) payload.area_id = area_id;
    if (target) payload.target = target;

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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'exception', detail: e?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, hint: 'POST { domain, service, entity_id?, area_id?, target?, data? } to call HA service' },
    { status: 200 }
  );
}
