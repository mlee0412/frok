import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Test endpoint to verify Sentry is working
 * GET /api/test-sentry
 */
export async function GET() {
  try {
    // Capture a test message
    Sentry.captureMessage('Sentry test from API route', 'info');

    // Throw a test error
    throw new Error('Sentry test error - this is intentional!');
  } catch (error: unknown) {
    // This will be captured by Sentry
    Sentry.captureException(error);

    return NextResponse.json({
      ok: true,
      message: 'Test error sent to Sentry. Check your Sentry dashboard.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
