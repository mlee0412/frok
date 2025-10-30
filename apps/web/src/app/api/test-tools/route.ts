import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try to import tools
    const { haSearch, haCall, memoryAdd, memorySearch, webSearch } = await import('@/lib/agent/tools');
    
    return NextResponse.json({
      ok: true,
      tools: [
        haSearch.name,
        haCall.name,
        memoryAdd.name,
        memorySearch.name,
        webSearch.name
      ]
    });
  } catch (error: unknown) {
    console.error('[test-tools error]', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
