import { NextResponse } from 'next/server';

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!base) {
    return NextResponse.json({ ok: false, detail: 'missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL' }, { status: 200 });
  }
  if (!anon) {
    return NextResponse.json({ ok: false, detail: 'missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY' }, { status: 200 });
  }
  const healthUrl = `${base.replace(/\/$/, '')}/auth/v1/health`;
  try {
    const r = await fetch(healthUrl, {
      cache: 'no-store',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });
    if (r.ok) {
      return NextResponse.json({ ok: true, detail: 'auth healthy' }, { status: 200 });
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
