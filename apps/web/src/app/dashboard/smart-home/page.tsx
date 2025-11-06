'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SmartHomeHeader } from '@/components/smart-home/SmartHomeHeader';
import { HASyncSettings } from '@/components/smart-home/HASyncSettings';

// Dynamic import for Lovelace Dashboard Enhanced (client-heavy component)
const LovelaceDashboardEnhanced = dynamic(() => import('@/components/lovelace/LovelaceDashboardEnhanced'), {
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-20 bg-surface/50 rounded" />
      <div className="h-32 bg-surface/50 rounded" />
      <div className="h-32 bg-surface/50 rounded" />
    </div>
  ),
  ssr: false,
});

export default function SmartHomePage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [haOk, setHaOk] = useState(false);
  const [haDetail, setHaDetail] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [haRes, devRes] = await Promise.all([
          fetch('/api/ping/mcp/home-assistant', { cache: 'no-store' }),
          fetch('/api/devices', { cache: 'no-store' }),
        ]);
        const ha = await haRes.json().catch(() => ({ ok: false, detail: 'error' }));
        const devicesList = await devRes.json().catch(() => []);

        setDevices(Array.isArray(devicesList) ? devicesList : []);
        setHaOk(!!(ha && typeof ha.ok === 'boolean' ? ha.ok : false));
        setHaDetail(ha?.detail);
      } catch (error) {
        console.error('[SmartHomePage] Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-12 bg-surface/50 rounded" />
        <div className="h-32 bg-surface/50 rounded" />
        <div className="h-64 bg-surface/50 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Analytics Button */}
      <SmartHomeHeader />

      {/* HA Sync Settings */}
      <HASyncSettings />

      {/* Lovelace Dashboard */}
      <LovelaceDashboardEnhanced initialDevices={devices} haOk={haOk} haDetail={haDetail} />
    </div>
  );
}
