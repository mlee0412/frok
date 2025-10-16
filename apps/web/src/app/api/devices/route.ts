import { NextResponse } from 'next/server';

function getHA() {
  const base = (process.env.HOME_ASSISTANT_URL || process.env.HA_BASE_URL || '').trim();
  const token = (process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || '').trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

async function haFetch<T>(ha: { base: string; token: string }, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${ha.base}${path}`, {
    headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
    ...init,
  });
  if (!r.ok) throw new Error(`status_${r.status}`);
  return (await r.json()) as T;
}

export async function GET() {
  const ha = getHA();
  if (!ha) return NextResponse.json({ ok: false, error: 'missing_home_assistant_env' }, { status: 400 });
  try {
    const states = await haFetch<Array<{ entity_id: string; state: string; attributes?: Record<string, unknown> }>>(ha, '/api/states');

    let areas: Array<{ area_id?: string; id?: string; name?: string }> = [];
    let devices: Array<{ id?: string; area_id?: string }> = [];
    let entities: Array<{ entity_id?: string; device_id?: string }> = [];
    try {
      areas = await haFetch(ha, '/api/config/area_registry/list', { method: 'POST', body: '{}' });
      devices = await haFetch(ha, '/api/config/device_registry/list', { method: 'POST', body: '{}' });
      entities = await haFetch(ha, '/api/config/entity_registry/list', { method: 'POST', body: '{}' });
    } catch {}

    const areaNameById = new Map<string, string>();
    for (const a of areas || []) {
      const key = (a.area_id || a.id || '').toString();
      const name = (a.name || '').toString();
      if (key && name) areaNameById.set(key, name);
    }
    const areaIdByDeviceId = new Map<string, string>();
    for (const d of devices || []) {
      const did = (d.id || '').toString();
      const aid = (d.area_id || '').toString();
      if (did && aid) areaIdByDeviceId.set(did, aid);
    }
    const deviceIdByEntityId = new Map<string, string>();
    for (const e of entities || []) {
      const eid = (e.entity_id || '').toString();
      const did = (e.device_id || '').toString();
      if (eid && did) deviceIdByEntityId.set(eid, did);
    }

    const list = states
      .map((s) => {
        const raw = s.entity_id.split('.')[0];
        const domain: 'light' | 'media_player' | 'climate' | 'sensor' | 'switch' | 'cover' | 'scene' | 'script' | 'other' =
          raw === 'light' || raw === 'media_player' || raw === 'climate' || raw === 'sensor' || raw === 'switch' || raw === 'cover' || raw === 'scene' || raw === 'script' ? raw : 'other';
        const name = String((s.attributes?.friendly_name as string) || s.entity_id);
        const online = s.state !== 'unavailable';
        const did = deviceIdByEntityId.get(s.entity_id) || '';
        const aid = did ? areaIdByDeviceId.get(did) || '' : '';
        const area = aid ? areaNameById.get(aid) || '' : '';
        const attrs = s.attributes || {};
        const state = s.state;
        return { id: s.entity_id, name, type: domain, area, area_id: aid, online, attrs, state };
      });
    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    const status = msg.startsWith('status_') ? Number(msg.replace('status_', '')) || 502 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
