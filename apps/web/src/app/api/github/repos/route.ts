import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GITHUB_TOKEN || '';
  if (!token.trim()) return NextResponse.json({ ok: false, error: 'missing GITHUB_TOKEN' }, { status: 200 });
  try {
    const r = await fetch('https://api.github.com/user/repos?per_page=20&sort=updated', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      cache: 'no-store'
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: `status ${r.status}` }, { status: 200 });
    const repos = await r.json();
    type Repo = { id: number | string; name?: string; full_name?: string; private?: boolean; html_url?: string };
    const list = Array.isArray(repos)
      ? (repos as Repo[]).map((x) => ({ id: x.id, name: x.name, full_name: x.full_name, private: x.private, url: x.html_url }))
      : [];
    return NextResponse.json({ ok: true, repos: list }, { status: 200 });
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
