import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[test-agent-init] Starting...');
    
    // Try to create agent
    const { createAgent } = await import('@/lib/agent/runWorkflow') as any;
    console.log('[test-agent-init] Imported createAgent');
    
    const agent = createAgent();
    console.log('[test-agent-init] Created agent:', agent.name);
    
    return NextResponse.json({ 
      ok: true, 
      name: agent.name,
      model: agent.model 
    });
  } catch (e: any) {
    console.error('[test-agent-init error]', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || String(e),
      stack: e?.stack 
    }, { status: 500 });
  }
}
