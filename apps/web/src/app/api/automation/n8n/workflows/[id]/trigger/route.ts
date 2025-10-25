import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    {
      ok: false,
      error: 'gone',
      detail: `Use /api/n8n/workflows/${params.id || ':id'}/trigger instead of /api/automation/n8n/workflows/${params.id || ':id'}/trigger`,
    },
    { status: 410 }
  );
}
