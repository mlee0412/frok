import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow } from '@/lib/agent/runWorkflow';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Rate limiting (5 requests per minute for AI operations)
  const rateLimit = await withRateLimit(req, { preset: 'ai' });
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const body = await req.json().catch(() => ({}));
    const input_as_text = String((body?.input_as_text ?? '')).trim();
    if (!input_as_text) {
      return NextResponse.json({ ok: false, error: 'input_as_text_required' }, { status: 400 });
    }

    const result = await runWorkflow({ input_as_text });
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    console.error('[agent error]', error);
    const detail = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    return NextResponse.json({ ok: false, error: 'agent_error', detail, stack }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Rate limiting (5 requests per minute for AI operations)
  const rateLimit = await withRateLimit(req, { preset: 'ai' });
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ ok: true, hint: "Use POST with { input_as_text } or GET ?q=... to run a quick test." }, { status: 200 });
    }
    const result = await runWorkflow({ input_as_text: q });
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'exception';
    return NextResponse.json({ ok: false, error: 'agent_error', detail }, { status: 500 });
  }
}
