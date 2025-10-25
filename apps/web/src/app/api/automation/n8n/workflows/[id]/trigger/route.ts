import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return NextResponse.json(
    {
      ok: false,
      error: 'gone',
      detail: `Use /api/n8n/workflows/${id || ':id'}/trigger instead of /api/automation/n8n/workflows/${id || ':id'}/trigger`,
    },
    { status: 410 }
  );
}
