import { NextResponse } from 'next/server';

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

async function haFetch<T>(ha: { base: string; token: string }, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${ha.base}${path}`, {
    headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
    ...init,
  });
  if (!r.ok) throw new Error(`status_${r.status}`);
  return (await r.json()) as T;
}

async function sbUpsert(sb: { url: string; key: string }, table: string, rows: any[], onConflict: string) {
  const r = await fetch(`${sb.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
    cache: 'no-store',
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`sb_${table}_${r.status}${text ? ` ${text}` : ''}`);
  }
}

export async function POST() {
  const ha = getHA();
  const sb = getSB();
  if (!ha) return NextResponse.json({ ok: false, error: 'missing_home_assistant_env' }, { status: 400 });
  if (!sb) return NextResponse.json({ ok: false, error: 'missing_supabase_service_env' }, { status: 400 });
  try {
    let areas: any[] = [];
    let devices: any[] = [];
    let entities: any[] = [];

    try { areas = await haFetch<any[]>(ha, '/api/config/area_registry/list', { method: 'POST', body: '{}' }); }
    catch (e) { if (!(e instanceof Error && e.message.startsWith('status_404'))) throw new Error(`ha_areas_${(e as Error).message}`); }

    try { devices = await haFetch<any[]>(ha, '/api/config/device_registry/list', { method: 'POST', body: '{}' }); }
    catch (e) { if (!(e instanceof Error && e.message.startsWith('status_404'))) throw new Error(`ha_devices_${(e as Error).message}`); }

    try { entities = await haFetch<any[]>(ha, '/api/config/entity_registry/list', { method: 'POST', body: '{}' }); }
    catch (e) {
      const is404 = e instanceof Error && e.message.startsWith('status_404');
      if (!is404) throw new Error(`ha_entities_${(e as Error).message}`);
      const rs = await fetch(`${ha.base}/api/states`, { headers: { Authorization: `Bearer ${ha.token}` }, cache: 'no-store' });
      if (rs.ok) {
        const states = (await rs.json()) as Array<{ entity_id: string; attributes?: Record<string, unknown> }>;
        entities = states.map((s) => ({ entity_id: s.entity_id, name: (s.attributes?.friendly_name as string) || '', device_id: null, area_id: null }));
      }
    }

    const areaRows = (areas || []).map((a) => ({ area_id: String(a.area_id || a.id || ''), name: String(a.name || '') }));
    const deviceRows = (devices || []).map((d) => ({
      device_id: String(d.id || ''),
      name: String(d.name_by_user || d.name || ''),
      manufacturer: d.manufacturer ? String(d.manufacturer) : null,
      model: d.model ? String(d.model) : null,
      area_id: d.area_id ? String(d.area_id) : null,
    }));
    const entityRows = (entities || []).map((e) => ({
      entity_id: String(e.entity_id || ''),
      device_id: e.device_id ? String(e.device_id) : null,
      area_id: e.area_id ? String(e.area_id) : null,
      domain: String((String(e.entity_id || '').split('.')[0] || 'other')),
      name: String(e.name || e.original_name || ''),
      disabled_by: e.disabled_by ? String(e.disabled_by) : null,
    }));

    if (areaRows.length) await sbUpsert(sb, 'ha_areas', areaRows.filter((r) => r.area_id), 'area_id');
    if (deviceRows.length) await sbUpsert(sb, 'ha_devices', deviceRows.filter((r) => r.device_id), 'device_id');
    if (entityRows.length) await sbUpsert(sb, 'ha_entities', entityRows.filter((r) => r.entity_id), 'entity_id');

    return NextResponse.json({ ok: true, areas: areaRows.length, devices: deviceRows.length, entities: entityRows.length }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    const mr = /^sb_\w+_(\d{3})(.*)$/.exec(msg);
    const sr = /^ha_\w+_(status_\d{3})$/.exec(msg);
    const status = mr ? Number(mr[1]) : 500;
    return NextResponse.json({ ok: false, error: sr ? sr[1] : msg }, { status });
  }
}
