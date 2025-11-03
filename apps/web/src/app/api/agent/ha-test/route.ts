import { NextRequest, NextResponse } from 'next/server';

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
    const q = url.searchParams.get('q') || 'Search for lights in kitchen';

    console.log('[ha-test] Running with:', q);
    const { runWorkflowHaOnly } = await import('@/lib/agent/runWorkflow-ha-only');
    // Dev-only route: Use test user ID
    const result = await runWorkflowHaOnly({
      input_as_text: q,
      userId: 'test-user-dev', // Test user ID for development
    });
    console.log('[ha-test] Success:', result);

    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    console.error('[ha-test error]', error);
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
