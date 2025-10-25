import { NextResponse } from 'next/server';
import { runWorkflowSimple } from '@/lib/agent/runWorkflow-simple';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || 'Hello';
    
    console.log('[agent/test] Running simple workflow with:', q);
    const result = await runWorkflowSimple({ input_as_text: q });
    console.log('[agent/test] Success:', result);
    
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error('[agent/test error]', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || String(e),
      stack: e?.stack 
    }, { status: 500 });
  }
}
