import React from 'react';
import { Card } from '@/components/ui/card';
import { headers } from 'next/headers';
import type { Device } from '@frok/clients';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: 'online' | 'offline' | 'all' }>;
}) {
  const { q = '', type = '', status = 'all' } = await searchParams;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const r = await fetch(`${base}/api/devices`, { cache: 'no-store' });
  const raw = await r.json().catch(() => []);
  const devices: Device[] = Array.isArray(raw) ? raw : [];
  const query = (q || '').toLowerCase().trim();
  const typeQuery = (type || '').toLowerCase().trim();
  const filtered = devices.filter((d) => {
    const matchesText = query
      ? [d.name, d.area, d.type].filter(Boolean).some((v) => String(v).toLowerCase().includes(query))
      : true;
    const matchesType = typeQuery ? (d.type || 'other').toLowerCase() === typeQuery : true;
    const matchesStatus =
      status === 'all'
        ? true
        : status === 'online'
          ? d.online !== false
          : d.online === false;
    return matchesText && matchesType && matchesStatus;
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Devices</h1>
      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q || ''}
          placeholder="Search name, area, type"
          className="border rounded px-3 py-2 text-sm"
        />
        <select name="type" defaultValue={type || ''} className="border rounded px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="light">Light</option>
          <option value="media_player">Media Player</option>
          <option value="climate">Climate</option>
          <option value="sensor">Sensor</option>
          <option value="switch">Switch</option>
          <option value="other">Other</option>
        </select>
        <select name="status" defaultValue={status || 'all'} className="border rounded px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <button type="submit" className="border rounded px-3 py-2 text-sm">Apply</button>
        <a href="/devices" className="text-sm text-cyan-600 hover:underline">Clear</a>
      </form>
      <div className="text-xs text-gray-500">Showing {filtered.length} of {devices.length}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((d: Device) => (
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
