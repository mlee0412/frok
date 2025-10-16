import { NextResponse } from 'next/server';

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!base || !anon) {
    return NextResponse.json({ ok: false, detail: 'missing supabase url or anon key' }, { status: 200 });
  }
  const url = `${base.replace(/\/$/, '')}/rest/v1/users?select=id&limit=1`;
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        Accept: 'application/json'
      }
    });
    if (r.ok) {
      const j = (await r.json()) as unknown[];
      return NextResponse.json({ ok: true, detail: `users: ${Array.isArray(j) ? j.length : 0}` }, { status: 200 });
    }
    const text = await r.text().catch(() => '');
    return NextResponse.json({ ok: false, detail: `status ${r.status}${text ? ` ${text}` : ''}` }, { status: 200 });
  } catch (e: unknown) {
    const detail = (() => {
      if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
        return (e as { message: string }).message;
      }
      try { return JSON.stringify(e); } catch { return String(e); }
    })();
    return NextResponse.json({ ok: false, detail }, { status: 200 });
  }
}
