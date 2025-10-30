'use client';
import React from 'react';
import type { Device } from '@frok/clients';
import { callHAService, turnOn } from '@frok/clients';
import { Card, useToast } from '@frok/ui';

export default function DevicesTab() {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState('');
  const [status, setStatus] = React.useState<'all' | 'online' | 'offline'>('all');
  const [loading, setLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [pendingQuick, setPendingQuick] = React.useState<null | 'all_on' | 'all_off' | 'refresh'>(null);
  const toast = useToast();

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch('/api/devices', { cache: 'no-store' });
        const j = await r.json();
        if (!cancelled && Array.isArray(j)) {
          setDevices(j);
          setLastUpdated(new Date());
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const prevRef = React.useRef<Device[]>([]);
  React.useEffect(() => {
    const es = new EventSource('/api/devices/stream');
    const onDevices = (ev: MessageEvent) => {
      try {
        const j = JSON.parse(ev.data) as { ts: number; items: Device[] };
        if (!j || !Array.isArray(j.items)) return;
        const prev = prevRef.current;
        if (prev && prev.length > 0) {
          const prevMap = new Map(prev.map((d) => [d.id, d] as const));
          for (const d of j.items) {
            const p = prevMap.get(d.id);
            if (p && (p.online !== d.online)) {
              const nowOnline = d.online !== false;
              if (!nowOnline) toast.error(`${d.name} is offline`);
              else toast.success(`${d.name} is online`);
            }
          }
        }
        setDevices(j.items);
        setLastUpdated(new Date(j.ts));
        prevRef.current = j.items;
      } catch {}
    };
    es.addEventListener('devices', onDevices as any);
    es.addEventListener('error', () => {
      // ignore errors; EventSource will retry
    });
    return () => {
      es.removeEventListener('devices', onDevices as any);
      es.close();
    };
  }, [toast]);

  const filtered = React.useMemo(() => {
    const query = q.toLowerCase().trim();
    const t = type.toLowerCase().trim();
    return devices.filter((d) => {
      const matchesText = query
        ? [d.name, d.area, d.type].filter(Boolean).some((v) => String(v).toLowerCase().includes(query))
        : true;
      const matchesType = t ? (d.type || 'other').toLowerCase() === t : true;
      const matchesStatus =
        status === 'all' ? true : status === 'online' ? d.online !== false : d.online === false;
      return matchesText && matchesType && matchesStatus;
    });
  }, [devices, q, type, status]);

  const areaCount = React.useMemo(() => new Set(devices.map((d) => (d.area || '').trim()).filter(Boolean)).size, [devices]);
  const onlineCount = React.useMemo(() => devices.filter((d) => d.online !== false).length, [devices]);
  const offlineCount = React.useMemo(() => devices.filter((d) => d.online === false).length, [devices]);
  const countsByType = React.useMemo(() => {
    const types = ['light','media_player','climate','sensor','switch','cover','scene','script','other'] as const;
    const c: Record<string, number> = {};
    for (const t of types) c[t] = 0;
    devices.forEach((d) => { c[d.type || 'other'] = (c[d.type || 'other'] || 0) + 1; });
    return c;
  }, [devices]);

  const allLightIds = React.useMemo(() => devices.filter((d) => d.type === 'light').map((d) => d.id), [devices]);

  async function quick(action: 'refresh' | 'all_on' | 'all_off') {
    setPendingQuick(action);
    try {
      if (action === 'refresh') {
        const r = await fetch('/api/devices', { cache: 'no-store' });
        const j = await r.json();
        if (Array.isArray(j)) {
          setDevices(j);
          setLastUpdated(new Date());
        }
        toast.success('Devices refreshed');
      } else if (action === 'all_on') {
        if (allLightIds.length > 0) await turnOn(allLightIds, 'light');
        toast.success('All lights turned on');
      } else if (action === 'all_off') {
        if (allLightIds.length > 0) await callHAService({ domain: 'light', service: 'turn_off', entity_id: allLightIds });
        toast.success('All lights turned off');
      }
    } catch {}
    finally { setPendingQuick(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-3">
          <div className="text-xs text-foreground/60">Total Devices</div>
          <div className="text-xl font-semibold">{devices.length}</div>
          <div className="text-xs text-foreground/60">Areas: {areaCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-foreground/60">Online</div>
          <div className="text-xl font-semibold text-success">{onlineCount}</div>
          <div className="text-xs text-foreground/60">Offline: {offlineCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-foreground/60">Lights</div>
          <div className="text-xl font-semibold">{countsByType["light"] || 0}</div>
          <div className="text-xs text-foreground/60">Switches: {countsByType["switch"] || 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-foreground/60">Media / Climate</div>
          <div className="text-xl font-semibold">{(countsByType["media_player"] || 0) + (countsByType["climate"] || 0)}</div>
          <div className="text-xs text-foreground/60">Sensors: {countsByType["sensor"] || 0}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1">
          <button disabled={pendingQuick !== null} className="border border-border rounded px-2 py-1 text-sm" onClick={() => quick('refresh')}>
            {pendingQuick === 'refresh' ? 'Refreshing…' : 'Refresh'}
          </button>
          <button disabled={pendingQuick !== null || allLightIds.length === 0} className="border border-border rounded px-2 py-1 text-sm" onClick={() => quick('all_on')}>
            {pendingQuick === 'all_on' ? '...' : 'All Lights On'}
          </button>
          <button disabled={pendingQuick !== null || allLightIds.length === 0} className="border border-border rounded px-2 py-1 text-sm" onClick={() => quick('all_off')}>
            {pendingQuick === 'all_off' ? '...' : 'All Lights Off'}
          </button>
        </div>
        <div className="text-xs text-foreground/60 ml-auto">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}</div>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search name, area, type"
          className="border border-border bg-surface rounded px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
        <select className="border border-border bg-surface rounded px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.currentTarget.value)}>
          <option value="">All types</option>
          <option value="light">Light</option>
          <option value="media_player">Media Player</option>
          <option value="climate">Climate</option>
          <option value="sensor">Sensor</option>
          <option value="switch">Switch</option>
          <option value="cover">Cover</option>
          <option value="scene">Scene</option>
          <option value="script">Script</option>
          <option value="other">Other</option>
        </select>
        <select className="border border-border bg-surface rounded px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.currentTarget.value as any)}>
          <option value="all">All</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </form>
      <div className="text-xs text-foreground/60">Showing {filtered.length} of {devices.length}{loading ? ' • loading…' : ''}</div>
      {loading && devices.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 w-1/3 bg-border rounded mb-2" />
              <div className="h-3 w-2/3 bg-border rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="font-medium">{d.name}</div>
              <div className="text-sm text-foreground/60">
                {(d.type || 'unknown')}{d.area ? ` • ${d.area}` : ''}{d.online === false ? ' • offline' : ''}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
