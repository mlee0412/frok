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

  const query = String(body?.query || '').trim().toLowerCase();
  const domain = String(body?.domain || '').trim().toLowerCase();

  if (!query) {
    return NextResponse.json({ ok: false, error: 'query_required' }, { status: 400 });
  }

  try {
    // Fetch states (entities)
    const statesRes = await fetch(`${ha.base}/api/states`, {
      headers: { Authorization: `Bearer ${ha.token}` },
      cache: 'no-store',
    });
    if (!statesRes.ok) {
      return NextResponse.json({ ok: false, error: `status_${statesRes.status}` }, { status: statesRes.status });
    }
    const states: any[] = await statesRes.json();

    // Filter entities by query and optional domain
    const entities = states
      .filter((s) => {
        const entityId = String(s.entity_id || '').toLowerCase();
        const friendlyName = String(s.attributes?.["friendly_name"] || '').toLowerCase();
        const matchesQuery = entityId.includes(query) || friendlyName.includes(query);
        const matchesDomain = domain ? entityId.startsWith(`${domain}.`) : true;
        return matchesQuery && matchesDomain;
      })
      .slice(0, 20)
      .map((s) => ({
        entity_id: s.entity_id,
        friendly_name: s.attributes?.["friendly_name"] || s.entity_id,
        state: s.state,
        domain: s.entity_id.split('.')[0],
      }));

    // Fetch areas
    const areasRes = await fetch(`${ha.base}/api/config/area_registry`, {
      headers: { Authorization: `Bearer ${ha.token}` },
      cache: 'no-store',
    });
    const areas: any[] = areasRes.ok ? await areasRes.json() : [];
    const matchingAreas = areas
      .filter((a) => {
        const name = String(a.name || '').toLowerCase();
        return name.includes(query);
      })
      .slice(0, 10)
      .map((a) => ({
        area_id: a.area_id,
        name: a.name,
      }));

    return NextResponse.json({ ok: true, entities, areas: matchingAreas }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'exception', detail: e?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST { query, domain? } to search HA entities and areas' }, { status: 200 });
}
