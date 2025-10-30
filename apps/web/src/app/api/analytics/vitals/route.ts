import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log metrics (in production, send to analytics service like Vercel Analytics, DataDog, etc.)
    console.log('[Web Vitals]', {
      name: body.name,
      value: body.value,
      rating: body.rating,
      delta: body.delta,
      id: body.id,
      navigationType: body.navigationType,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send to analytics service
    // await sendToAnalytics(body);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Web Vitals] Error:', error);
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
  }
}
