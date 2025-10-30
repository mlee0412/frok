import { NextResponse } from 'next/server';

function getHA() {
  const base = (process.env["HOME_ASSISTANT_URL"] || process.env["HA_BASE_URL"] || '').trim();
  const token = (process.env["HOME_ASSISTANT_TOKEN"] || process.env["HA_TOKEN"] || '').trim();
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
  const entity_id_raw = body?.entity_id;
  const entity_id = Array.isArray(entity_id_raw)
    ? entity_id_raw.map((e: unknown) => String(e)).filter(Boolean)
    : (typeof entity_id_raw === 'string' ? entity_id_raw.trim() : '');
  const target = (body?.target && typeof body.target === 'object') ? body.target : undefined;
  const data = (body?.data && typeof body.data === 'object') ? body.data : {};
  if (!domain || !service || (!entity_id && !target)) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }
  try {
    const r = await fetch(`${ha.base}/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(entity_id ? { entity_id } : {}), ...(target ? { target } : {}), ...data }),
      cache: 'no-store',
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: `status_${r.status}` }, { status: r.status || 502 });
    const res = await r.json().catch(() => null);
    return NextResponse.json({ ok: true, res }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'exception' }, { status: 500 });
  }
}
