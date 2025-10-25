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
  } catch (e: any) {
    console.error('[test-tools error]', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || String(e),
      stack: e?.stack 
    }, { status: 500 });
  }
}
