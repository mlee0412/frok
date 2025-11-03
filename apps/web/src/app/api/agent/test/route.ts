import { NextRequest, NextResponse } from 'next/server';
import { runWorkflowSimple } from '@/lib/agent/runWorkflow-simple';

export async function GET(req: NextRequest) {
  // Environment gating: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { ok: false, error: 'Test endpoints not available in production' },
      { status: 404 }
    );
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || 'Hello';

    console.log('[agent/test] Running simple workflow with:', q);
    // Dev-only route: Use test user ID
    const result = await runWorkflowSimple({
      input_as_text: q,
      userId: 'test-user-dev', // Test user ID for development
    });
    console.log('[agent/test] Success:', result);

    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    console.error('[agent/test error]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
