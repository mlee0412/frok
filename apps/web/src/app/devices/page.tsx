import React from 'react';
import { Card } from '@/components/ui/card';
import { getDevices } from '@frok/clients';
import type { Device } from '@frok/clients';

export default async function DevicesPage() {
  const devices = await getDevices();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Devices</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((d: Device) => (
          <Card key={d.id}>
            <div className="font-medium">{d.name}</div>
            <div className="text-sm text-gray-500">
              {d.type || 'unknown'} {d.area ? `• ${d.area}` : ''}{' '}
              {d.online === false ? '• offline' : ''}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
