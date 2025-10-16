'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Device } from '@frok/clients';
import { Card } from '@/components/ui/card';
import DeviceControls from '@/components/smart-home/DeviceControls';
import SyncButtons from '@/components/smart-home/SyncButtons';
import AreaLightControls from '@/components/smart-home/AreaLightControls';
import { callHAService, lightTurnOnTarget, turnOn, sceneTurnOn, scriptTurnOn } from '@frok/clients';

export default function SmartHomeView({ initialDevices, haOk, haDetail }: { initialDevices: Device[]; haOk: boolean; haDetail?: string }) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollMs, setPollMs] = useState<number>(4000);
  const timer = useRef<number | null>(null);
  const [pendingQuick, setPendingQuick] = useState<string | null>(null);
  const [pendingScene, setPendingScene] = useState<string | null>(null);
  const [pendingScript, setPendingScript] = useState<string | null>(null);
  const showSet = useMemo(() => new Set(['light','switch','media_player','climate','cover','scene','script']), []);

  useEffect(() => {
    function schedule() {
      timer.current = window.setTimeout(async () => {
        try {
          const r = await fetch('/api/devices', { cache: 'no-store' });
          if (r.ok) {
            const j = await r.json();
            if (Array.isArray(j)) {
              setDevices(j);
              setLastUpdated(new Date());
            }
          }
        } catch {}
        schedule();
      }, pollMs) as unknown as number;
    }
    schedule();
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [pollMs]);

  const groups = useMemo(() => {
    const m = new Map<string, Device[]>();
    for (const d of devices) {
      const key = d.area && d.area.trim() ? d.area : 'Other';
      const arr = m.get(key) || [];
      arr.push(d);
      m.set(key, arr);
    }
    return m;
  }, [devices]);

  const areas = useMemo(() => Array.from(groups.keys()).sort((a, b) => a.localeCompare(b)), [groups]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { light: 0, media_player: 0, climate: 0, sensor: 0, switch: 0, cover: 0, other: 0 };
    devices.forEach((d) => { c[d.type || 'other'] = (c[d.type || 'other'] || 0) + 1; });
    return c;
  }, [devices]);

  const lightsOn = useMemo(() => devices.filter((d) => (d.type === 'light' || d.type === 'switch') && (d.state === 'on')).length, [devices]);
  const mediaPlaying = useMemo(() => devices.filter((d) => d.type === 'media_player' && (d.state === 'playing')).length, [devices]);
  const coversOpen = useMemo(() => devices.filter((d) => d.type === 'cover' && (d.state && d.state !== 'closed')).length, [devices]);
  const hvacActions = useMemo(() => devices.filter((d) => d.type === 'climate').map((d) => String(((d.attrs || {})['hvac_action'] || '')).toLowerCase()), [devices]);
  const heating = useMemo(() => hvacActions.filter((a) => a === 'heating').length, [hvacActions]);
  const cooling = useMemo(() => hvacActions.filter((a) => a === 'cooling').length, [hvacActions]);

  const allLightIds = useMemo(() => devices.filter((d) => d.type === 'light').map((d) => d.id), [devices]);
  const scenes = useMemo(() => devices.filter((d) => d.type === 'scene'), [devices]);
  const scripts = useMemo(() => devices.filter((d) => d.type === 'script'), [devices]);

  async function quick(action: 'all_on' | 'all_off') {
    setPendingQuick(action);
    try {
      if (action === 'all_on') {
        if (allLightIds.length === 0) return;
        await turnOn(allLightIds, 'light');
      } else {
        if (allLightIds.length === 0) return;
        await callHAService({ domain: 'light', service: 'turn_off', entity_id: allLightIds });
      }
      setLastUpdated(new Date());
    } catch {}
    finally { setPendingQuick(null); }
  }

  async function runScene(id: string) {
    setPendingScene(id);
    try {
      await sceneTurnOn(id);
      setLastUpdated(new Date());
    } finally {
      setPendingScene(null);
    }
  }

  async function runScript(id: string) {
    setPendingScript(id);
    try {
      await scriptTurnOn(id);
      setLastUpdated(new Date());
    } finally {
      setPendingScript(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <div className="font-medium">Home Assistant</div>
          <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${haOk ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>{haOk ? 'OK' : 'Fail'}</span>
        </div>
        <div className="text-sm text-gray-500 md:text-right">{haDetail || ''}</div>
        <div className="text-sm">Devices: {devices.length}</div>
        <div className="text-sm md:text-right">Lights: {counts.light || 0} • Media: {counts.media_player || 0} • Climate: {counts.climate || 0} • Sensors: {counts.sensor || 0} • Switches: {counts.switch || 0} • Covers: {counts.cover || 0}</div>
        <div className="text-sm">On: {lightsOn} • Playing: {mediaPlaying} • Covers open: {coversOpen} • Heating: {heating} • Cooling: {cooling}</div>
        <div className="flex items-center gap-3 md:justify-end">
          <div className="text-sm text-gray-500">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}</div>
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
            <span className="text-sm">Poll</span>
            <select className="border rounded px-2 py-1 text-sm" value={pollMs} onChange={(e) => setPollMs(Number(e.currentTarget.value))}>
              <option value={3000}>3s</option>
              <option value={4000}>4s</option>
              <option value={5000}>5s</option>
              <option value={8000}>8s</option>
              <option value={15000}>15s</option>
            </select>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
            <button disabled={pendingQuick !== null} className="border rounded px-2 py-1" onClick={() => quick('all_on')}>{pendingQuick === 'all_on' ? '...' : 'All Lights On'}</button>
            <button disabled={pendingQuick !== null} className="border rounded px-2 py-1" onClick={() => quick('all_off')}>{pendingQuick === 'all_off' ? '...' : 'All Lights Off'}</button>
          </div>
          <div className="ml-auto md:ml-0"><SyncButtons /></div>
        </div>
      </div>

      <div className="space-y-6">
        {(scenes.length > 0 || scripts.length > 0) && (
          <div className="space-y-3">
            {scenes.length > 0 && (
              <div className="relative -mx-2 overflow-x-auto scroll-x-neon">
                <div className="inline-flex items-center gap-2 px-2 min-w-max">
                  <div className="text-sm font-medium pr-2">Scenes</div>
                  {scenes.map((s) => (
                    <button key={s.id} disabled={pendingScene === s.id} className="border rounded px-2 py-1 text-sm" onClick={() => runScene(s.id)}>
                      {pendingScene === s.id ? '...' : s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {scripts.length > 0 && (
              <div className="relative -mx-2 overflow-x-auto scroll-x-neon">
                <div className="inline-flex items-center gap-2 px-2 min-w-max">
                  <div className="text-sm font-medium pr-2">Scripts</div>
                  {scripts.map((s) => (
                    <button key={s.id} disabled={pendingScript === s.id} className="border rounded px-2 py-1 text-sm" onClick={() => runScript(s.id)}>
                      {pendingScript === s.id ? '...' : s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {areas.map((area) => (
          <div key={area} className="space-y-3">
            <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/10 rounded md:rounded-none text-lg font-medium">{area}</div>
            <AreaLightControls area={area} devices={groups.get(area)!} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.get(area)!.filter((d) => showSet.has(d.type || 'other')).map((d) => (
                <Card key={d.id}>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${d.online === false ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        <div className="font-medium">{d.name}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 border border-white/10 bg-white/5 text-gray-300">{d.type || 'unknown'}</span>
                    </div>
                    <div className="text-sm text-gray-500">{d.state || ''}</div>
                    <DeviceControls device={d} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
