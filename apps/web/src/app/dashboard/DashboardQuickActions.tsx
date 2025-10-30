'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, useToast } from '@frok/ui';
import { callHAService, turnOn } from '@frok/clients';

export default function DashboardQuickActions() {
  const router = useRouter();
  const [pending, setPending] = React.useState<null | 'refresh' | 'all_on' | 'all_off'>(null);
  const toast = useToast();

  async function refreshDevices() {
    setPending('refresh');
    try {
      await fetch('/api/devices', { cache: 'no-store' });
      toast.success('Devices refreshed');
    } catch {
      toast.error('Failed to refresh devices');
    } finally {
      setPending(null);
    }
  }

  async function lights(action: 'on' | 'off') {
    setPending(action === 'on' ? 'all_on' : 'all_off');
    try {
      const r = await fetch('/api/devices', { cache: 'no-store' });
      const j = await r.json();
      type HADevice = { type?: string; id?: string };
      const devices = Array.isArray(j) ? j as HADevice[] : [];
      const ids: string[] = devices.filter((d) => d.type === 'light').map((d) => d.id || '').filter(Boolean);
      if (ids.length === 0) {
        toast.info('No lights found');
      } else if (action === 'on') {
        await turnOn(ids, 'light');
        toast.success('All lights turned on');
      } else {
        await callHAService({ domain: 'light', service: 'turn_off', entity_id: ids });
        toast.success('All lights turned off');
      }
    } catch {
      toast.error('Failed to control lights');
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending !== null} onClick={refreshDevices}>
          {pending === 'refresh' ? 'Refreshing…' : 'Refresh Devices'}
        </Button>
        <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => router.push('/dashboard/system?tab=health')}>
          System Health
        </Button>
        <span className="mx-2 h-4 w-px bg-border" />
        <Button size="sm" disabled={pending !== null} onClick={() => lights('on')}>
          {pending === 'all_on' ? 'Working…' : 'All Lights On'}
        </Button>
        <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => lights('off')}>
          {pending === 'all_off' ? 'Working…' : 'All Lights Off'}
        </Button>
      </div>
    </Card>
  );
}
