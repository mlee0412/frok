import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || 'Search for lights in kitchen';
    
    console.log('[ha-test] Running with:', q);
    const { runWorkflowHaOnly } = await import('@/lib/agent/runWorkflow-ha-only');
    const result = await runWorkflowHaOnly({ input_as_text: q });
    console.log('[ha-test] Success:', result);
    
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error('[ha-test error]', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || String(e),
      stack: e?.stack 
    }, { status: 500 });
  }
}
