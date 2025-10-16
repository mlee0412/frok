import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

function getHA() {
  const base = (process.env.HOME_ASSISTANT_URL || process.env.HA_BASE_URL || '').trim();
  const token = (process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || '').trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

function getSB() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

export async function POST() {
  const ha = getHA();
  const sb = getSB();
  if (!ha) return NextResponse.json({ ok: false, error: 'missing_home_assistant_env' }, { status: 400 });
  if (!sb) return NextResponse.json({ ok: false, error: 'missing_supabase_service_env' }, { status: 400 });
  try {
    const r = await fetch(`${ha.base}/api/states`, {
      headers: { Authorization: `Bearer ${ha.token}` },
      cache: 'no-store',
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: `status_${r.status}` }, { status: r.status || 502 });
    const states = (await r.json()) as Array<{ entity_id: string; state: string; attributes?: Record<string, unknown> }>;

    const minimalEntities = states.map((s) => ({
      entity_id: s.entity_id,
      device_id: null as any,
      area_id: null as any,
      domain: String((s.entity_id.split('.')[0] || 'other')),
      name: String((s.attributes?.friendly_name as string) || ''),
      disabled_by: null as any,
    }));

    const up = await fetch(`${sb.url}/rest/v1/ha_entities?on_conflict=entity_id`, {
      method: 'POST',
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(minimalEntities),
      cache: 'no-store',
    });
    if (!up.ok) {
      const text = await up.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `sb_entities_${up.status}${text ? ` ${text}` : ''}` }, { status: up.status || 502 });
    }

    const rows = states.map((s) => ({ id: randomUUID(), entity_id: s.entity_id, state: s.state, attrs: s.attributes || {} }));
    const rr = await fetch(`${sb.url}/rest/v1/ha_entity_snapshots`, {
      method: 'POST',
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
      cache: 'no-store',
    });
    if (!rr.ok) {
      const text = await rr.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `sb_snap_${rr.status}${text ? ` ${text}` : ''}` }, { status: rr.status || 502 });
    }

    return NextResponse.json({ ok: true, inserted: rows.length }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
