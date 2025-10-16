import React from 'react';
import { Card } from '@/components/ui/card';
import { getDevices } from '@frok/clients';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SmartHomePage() {
  const [ha, devices] = await Promise.all([
    fetch('/api/ping/mcp/home-assistant', { cache: 'no-store' })
      .then((r) => r.json())
      .catch(() => ({ ok: false, detail: 'error' })),
    getDevices(),
  ]);

  const ok = !!(ha && typeof ha.ok === 'boolean' ? ha.ok : false);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Smart Home</h1>
      <Card>
        <div className="flex items-center justify-between">
          <div className="font-medium">Home Assistant</div>
          <div className={ok ? 'text-green-600' : 'text-red-600'}>{ok ? 'ok' : 'fail'}</div>
        </div>
        <div className="text-sm text-gray-500 mt-1">{ha?.detail ?? ''}</div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((d) => (
          <Card key={d.id}>
            <div className="font-medium">{d.name}</div>
            <div className="text-sm text-gray-500">
              {d.type || 'unknown'} {d.area ? `• ${d.area}` : ''} {d.online === false ? '• offline' : ''}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
