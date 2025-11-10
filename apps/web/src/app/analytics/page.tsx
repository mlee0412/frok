'use client';

/**
 * Analytics Page - Root level analytics dashboard
 *
 * Provides system-wide analytics and metrics overview.
 * Redirects to /dashboard/analytics for consistency.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard analytics for consistency
    router.replace('/dashboard/analytics');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-foreground/60">Redirecting to Analytics...</p>
      </div>
    </div>
  );
}
