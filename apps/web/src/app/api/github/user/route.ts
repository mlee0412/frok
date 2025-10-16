import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GITHUB_TOKEN || '';
  if (!token.trim()) return NextResponse.json({ ok: false, error: 'missing GITHUB_TOKEN' }, { status: 200 });
  try {
    const r = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      cache: 'no-store'
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: `status ${r.status}` }, { status: 200 });
    const user = await r.json();
    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (e: unknown) {
    const error = (() => {
      if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
        return (e as { message: string }).message;
      }
      try { return JSON.stringify(e); } catch { return String(e); }
    })();
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
