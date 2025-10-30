import { NextResponse } from 'next/server';

const DEFAULT_CHATKIT_BASE = 'https://api.openai.com';
const SESSION_COOKIE_NAME = 'chatkit_session_id';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [rawName, ...rest] = p.split('=');
    if (!rawName || rest.length === 0) continue;
    if (rawName.trim() === name) return rest.join('=').trim();
  }
  return null;
}

function serializeSessionCookie(value: string): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env["NODE_ENV"] === 'production') attrs.push('Secure');
  return attrs.join('; ');
}

function resolveUserId(cookieHeader: string | null): { userId: string; sessionCookie: string | null } {
  const existing = getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  if (existing) return { userId: existing, sessionCookie: null };
  const generated = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return { userId: generated, sessionCookie: serializeSessionCookie(generated) };
}

export async function POST(req: Request) {
  const apiKey = process.env["OPENAI_API_KEY"];
  const workflowId = process.env["WORKFLOW_ID"];
  if (!apiKey || !workflowId) {
    return NextResponse.json({ error: 'missing_openai_env', detail: 'Set OPENAI_API_KEY and WORKFLOW_ID in apps/web/.env.local' }, { status: 500 });
  }

  // We accept the current secret but simply request a fresh session
  // so the widget can re-connect with a valid token.
  // Consume request body (intentionally unused)
  await req.json().catch(() => null);

  const { userId, sessionCookie } = resolveUserId(req.headers.get('cookie'));
  const apiBase = process.env["CHATKIT_API_BASE"]?.trim() || DEFAULT_CHATKIT_BASE;
  const url = `${apiBase}/v1/chatkit/sessions`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Beta': 'chatkit_beta=v1',
    },
    body: JSON.stringify({
      workflow: { id: workflowId },
      user: userId,
      chatkit_configuration: { file_upload: { enabled: true } },
    }),
  });

  const data: any = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const res = NextResponse.json({ error: data?.error || 'session_refresh_failed', details: data }, { status: upstream.status });
    if (sessionCookie) res.headers.set('Set-Cookie', sessionCookie);
    return res;
  }

  const res = NextResponse.json({ client_secret: data?.client_secret ?? null, expires_after: data?.expires_after ?? null }, { status: 200 });
  if (sessionCookie) res.headers.set('Set-Cookie', sessionCookie);
  return res;
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'Use POST to refresh a ChatKit session' }, { status: 200 });
}
