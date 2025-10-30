import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[test-agent-init] Starting...');

    // Try to create agent
    const workflowModule = await import('@/lib/agent/runWorkflow');
    const createAgent = 'createAgent' in workflowModule ? (workflowModule as { createAgent: () => { name: string; model: string } }).createAgent : null;
    if (!createAgent) {
      throw new Error('createAgent function not found in runWorkflow module');
    }
    console.log('[test-agent-init] Imported createAgent');

    const agent = createAgent();
    console.log('[test-agent-init] Created agent:', agent.name);

    return NextResponse.json({
      ok: true,
      name: agent.name,
      model: agent.model
    });
  } catch (error: unknown) {
    console.error('[test-agent-init error]', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
