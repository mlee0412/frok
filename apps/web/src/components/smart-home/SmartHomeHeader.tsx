'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

export function SmartHomeHeader() {
  const router = useRouter();

  const handleAnalyticsClick = useCallback(() => {
    console.log('[SmartHomeHeader] Navigating to analytics...');
    router.push('/dashboard/smart-home/analytics');
  }, [router]);

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <h1 className="text-2xl font-semibold text-foreground">Smart Home</h1>
      <button
        type="button"
        onClick={handleAnalyticsClick}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-all text-primary font-medium cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="View Analytics Dashboard"
      >
        <BarChart3 size={20} aria-hidden="true" />
        <span>Analytics</span>
      </button>
    </div>
  );
}
