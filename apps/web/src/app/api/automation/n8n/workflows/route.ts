import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'gone', detail: 'Use /api/n8n/workflows instead of /api/automation/n8n/workflows' },
    { status: 410 }
  );
}
