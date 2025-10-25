import { NextResponse } from 'next/server';
import { runWorkflow } from '@/lib/agent/runWorkflow';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input_as_text = String((body?.input_as_text ?? '')).trim();
    if (!input_as_text) {
      return NextResponse.json({ ok: false, error: 'input_as_text_required' }, { status: 400 });
    }

    const result = await runWorkflow({ input_as_text });
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error('[agent error]', e);
    const detail = e?.message || String(e) || 'exception';
    const stack = e?.stack || '';
    return NextResponse.json({ ok: false, error: 'agent_error', detail, stack }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ ok: true, hint: "Use POST with { input_as_text } or GET ?q=... to run a quick test." }, { status: 200 });
    }
    const result = await runWorkflow({ input_as_text: q });
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (e: any) {
    const detail = e?.message || 'exception';
    return NextResponse.json({ ok: false, error: 'agent_error', detail }, { status: 500 });
  }
}
