import { NextResponse } from 'next/server';
import { getHealth } from '@frok/clients';

export async function GET() {
  const health = await getHealth();
  return NextResponse.json({ ok: true, data: health });
}
