'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Device } from '@frok/clients';

// Dynamic import for Analytics component with SSR disabled for better hydration
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
    ssr: false,
  }
);

export default function SmartHomeAnalyticsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDevices() {
      try {
        console.log('[SmartHomeAnalytics] Fetching devices...');
        const response = await fetch('/api/devices', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.status}`);
        }

        const data = await response.json();
        const devicesList = Array.isArray(data) ? data : [];
        setDevices(devicesList);
        console.log('[SmartHomeAnalytics] Loaded', devicesList.length, 'devices');
      } catch (err) {
        console.error('[SmartHomeAnalytics] Error fetching devices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load devices');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDevices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Error State */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger">
          <p className="font-medium">Error loading analytics</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface/50 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 bg-surface/50 rounded" />
            <div className="h-64 bg-surface/50 rounded" />
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {!isLoading && !error && <SmartHomeAnalytics devices={devices} />}
    </div>
  );
}
