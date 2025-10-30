import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log error (in production, send to error tracking service like Sentry, LogRocket, etc.)
    console.error('[Client Error]', {
      message: body.message,
      severity: body.severity,
      stack: body.stack,
      context: body.context,
      url: body.url,
      userAgent: body.userAgent,
      timestamp: body.timestamp,
    });

    // TODO: Send to error tracking service
    // await sendToSentry(body);
    // await sendToLogRocket(body);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Error Logger] Failed to log error:', error);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
