import React from 'react';
import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Dynamic import for Analytics component
const SmartHomeAnalytics = dynamic(() =>
  import('@/components/smart-home/SmartHomeAnalytics').then(mod => ({ default: mod.SmartHomeAnalytics })),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-surface/50 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-surface/50 rounded" />
          <div className="h-64 bg-surface/50 rounded" />
        </div>
      </div>
    ),
  }
);

// ISR with 15-second revalidation for smart home data
export const revalidate = 15;

export default async function SmartHomeAnalyticsPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;

  const devRes = await fetch(`${base}/api/devices`, { next: { revalidate: 15 } });
  const devicesList = await devRes.json().catch(() => []);
  const devices = Array.isArray(devicesList) ? devicesList : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/smart-home"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-surface transition-colors text-foreground"
        >
          <ChevronLeft size={20} />
          <span>Back to Controls</span>
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Smart Home Analytics</h1>
      </div>

      {/* Analytics Dashboard */}
      <SmartHomeAnalytics devices={devices} />
    </div>
  );
}
