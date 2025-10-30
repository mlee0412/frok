import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type PerformanceMetric = {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const metrics: PerformanceMetric[] = body.metrics || [];

    // Log metrics for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance Metrics]', {
        count: metrics.length,
        metrics: metrics.map((m) => ({
          name: m.name,
          value: Math.round(m.value),
          rating: m.rating,
        })),
      });
    }

    // In production, send to analytics service
    // Examples:
    // - Vercel Analytics
    // - DataDog
    // - New Relic
    // - Custom analytics database

    // TODO: Store in database or send to analytics service
    // await storeMetrics(metrics);

    // Example: Store in database
    /*
    await db.performanceMetrics.createMany({
      data: metrics.map(m => ({
        name: m.name,
        value: m.value,
        rating: m.rating,
        timestamp: new Date(m.timestamp),
        url: m.url,
        userAgent: request.headers.get('user-agent'),
      })),
    });
    */

    return NextResponse.json({ success: true, received: metrics.length }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Performance Metrics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to log metrics' },
      { status: 500 }
    );
  }
}
