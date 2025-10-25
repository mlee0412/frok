import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'gone', detail: 'Use /api/n8n/executions instead of /api/automation/n8n/executions' },
    { status: 410 }
  );
}
