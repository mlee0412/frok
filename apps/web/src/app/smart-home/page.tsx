import React from 'react';
import { Card } from '@/components/ui/card';
import { headers } from 'next/headers';
import type { Device } from '@frok/clients';
import SmartHomeView from '@/components/smart-home/SmartHomeView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SmartHomePage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const f = (p: string) => fetch(`${base}${p}`, { cache: 'no-store' });
  const [haRes, devRes] = await Promise.all([
    f('/api/ping/mcp/home-assistant'),
    f('/api/devices'),
  ]);
  const ha = await haRes.json().catch(() => ({ ok: false, detail: 'error' }));
  const devicesList = await devRes.json().catch(() => []);
  const devices: Device[] = Array.isArray(devicesList) ? devicesList : [];
  const ok = !!(ha && typeof ha.ok === 'boolean' ? ha.ok : false);
  const showSet = new Set(['light','switch','media_player','climate','cover','scene','script']);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Smart Home</h1>
      <Card className="p-4">
        <SmartHomeView initialDevices={devices} haOk={ok} haDetail={ha?.detail} />
      </Card>
    </div>
  );
}
