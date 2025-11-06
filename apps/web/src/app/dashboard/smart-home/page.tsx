import React from 'react';
import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
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
});

// ISR with 15-second revalidation for smart home data
export const revalidate = 15;

export default async function SmartHomePage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const f = (p: string) => fetch(`${base}${p}`, { next: { revalidate: 15 } });
  const [haRes, devRes] = await Promise.all([
    f('/api/ping/mcp/home-assistant'),
    f('/api/devices'),
  ]);
  const ha = await haRes.json().catch(() => ({ ok: false, detail: 'error' }));
  const devicesList = await devRes.json().catch(() => []);
  const devices = Array.isArray(devicesList) ? devicesList : [];
  const ok = !!(ha && typeof ha.ok === 'boolean' ? ha.ok : false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Smart Home</h1>
        <Link
          href="/dashboard/smart-home/analytics"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary bg-primary/10 hover:bg-primary/20 transition-colors text-primary font-medium"
        >
          <BarChart3 size={20} />
          <span>Analytics</span>
        </Link>
      </div>

      {/* HA Sync Settings */}
      <HASyncSettings />

      {/* Lovelace Dashboard */}
      <LovelaceDashboardEnhanced initialDevices={devices} haOk={ok} haDetail={ha?.detail} />
    </div>
  );
}
