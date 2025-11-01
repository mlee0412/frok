import { NextResponse } from 'next/server';
import { getAllFeatureFlags } from '@/lib/featureFlags';

/**
 * GET /api/feature-flags
 *
 * Returns current feature flag configuration.
 * Publicly accessible (no auth required) since flags control UI/UX, not sensitive data.
 */
export async function GET() {
  try {
    const flags = await getAllFeatureFlags();

    return NextResponse.json({
      ok: true,
      flags,
    });
  } catch (error: unknown) {
    console.error('[Feature Flags API] Error fetching flags:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch feature flags',
      },
      { status: 500 }
    );
  }
}

/**
 * Cache for 1 minute on CDN
 */
export const revalidate = 60;
