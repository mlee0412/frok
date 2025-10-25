import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = (params?.id || '').trim();
  const base = (process.env.N8N_URL || process.env.N8N_BASE_URL || '').trim();
  const key = (process.env.N8N_API_KEY || '').trim();
  if (!base || !key) {
    return NextResponse.json({ ok: false, error: 'missing_env', detail: 'Set N8N_URL (or N8N_BASE_URL) and N8N_API_KEY in apps/web/.env.local' }, { status: 200 });
  }
  if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });

  const url = `${base.replace(/\/$/, '')}/rest/workflows/run`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': key,
      },
      body: JSON.stringify({ workflowId: id }),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `status_${r.status}`, detail: text }, { status: 200 });
    }
    const data = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: 'exception', detail }, { status: 200 });
  }
}
