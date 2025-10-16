import { NextResponse } from 'next/server';

function hasEnv(keys: string[]): boolean {
  return keys.every((k) => !!process.env[k] && String(process.env[k]).trim().length > 0);
}

const REQUIREMENTS: Record<string, string[]> = {
  'home-assistant': ['HOME_ASSISTANT_URL', 'HOME_ASSISTANT_TOKEN', 'HA_BASE_URL', 'HA_TOKEN'],
  'github': ['GITHUB_TOKEN'],
  'google': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_PROJECT_ID'],
  'square': ['SQUARE_ACCESS_TOKEN', 'SQUARE_API_KEY']
};

export async function GET(_req: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const key = (tool || '').toLowerCase();
  const reqs = REQUIREMENTS[key];
  if (!reqs) {
    return NextResponse.json({ ok: false, detail: `unknown tool: ${key}` }, { status: 404 });
  }
  if (key === 'github') {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: false, detail: 'missing env for github' }, { status: 200 });
    }
    try {
      const r = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        cache: 'no-store'
      });
      if (r.ok) {
        const j = await r.json();
        const name = j?.login || j?.name || 'ok';
        return NextResponse.json({ ok: true, detail: `user: ${name}` }, { status: 200 });
      }
      return NextResponse.json({ ok: false, detail: `status ${r.status}` }, { status: 200 });
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
  const ok = hasEnv(reqs);
  return NextResponse.json({ ok, detail: ok ? 'env present' : `missing env for ${key}` }, { status: 200 });
}
