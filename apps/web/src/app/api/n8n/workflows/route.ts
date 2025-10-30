import { NextResponse } from 'next/server';

export async function GET() {
  const base = (process.env["N8N_URL"] || process.env["N8N_BASE_URL"] || '').trim();
  const key = (process.env["N8N_API_KEY"] || '').trim();
  if (!base || !key) {
    return NextResponse.json({ ok: false, error: 'missing_env', detail: 'Set N8N_URL (or N8N_BASE_URL) and N8N_API_KEY in apps/web/.env.local' }, { status: 200 });
  }
  const url = `${base.replace(/\/$/, '')}/rest/workflows`;
  try {
    const r = await fetch(url, { headers: { 'X-N8N-API-KEY': key }, cache: 'no-store' });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `status_${r.status}`, detail: text }, { status: 200 });
    }
    const data = await r.json();
    return NextResponse.json({ ok: true, workflows: data?.data || data || [] }, { status: 200 });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: 'exception', detail }, { status: 200 });
  }
}
