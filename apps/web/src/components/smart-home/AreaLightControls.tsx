'use client';
import React, { useMemo, useState } from 'react';
import ColorWheel from './ColorWheel';
import type { Device } from '@frok/clients';
import { lightTurnOnTarget, turnOn, lightTurnOff, lightSetBrightnessPct, lightSetColorTemp, lightSetHS, callHAService } from '@frok/clients';

export default function AreaLightControls({ area, devices }: { area: string; devices: Device[] }) {
  const lights = devices.filter((d) => d.type === 'light');
  if (lights.length === 0) return null;

  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(100);
  const [ct, setCt] = useState<number | ''>('');
  const [hsH, setHsH] = useState<number | ''>('');
  const [hsS, setHsS] = useState<number | ''>('');
  const [transition, setTransition] = useState<number>(0);
  const [colorHex, setColorHex] = useState<string>('#ffffff');
  const [xyX, setXyX] = useState<number | ''>('');
  const [xyY, setXyY] = useState<number | ''>('');
  const effectList = useMemo(() => {
    const set = new Set<string>();
    for (const l of lights) {
      const el = (l.attrs || {})['effect_list'] as unknown;
      if (Array.isArray(el)) for (const ef of el) if (typeof ef === 'string') set.add(ef);
    }
    return Array.from(set.values()).sort((a,b) => a.localeCompare(b));
  }, [lights]);
  const [areaEffect, setAreaEffect] = useState<string>('');
  const [wheelOpen, setWheelOpen] = useState(false);

  const areaId = lights.find((l) => l.area_id)?.area_id || '';
  const ids = lights.map((l) => l.id);

  async function run<T>(fn: () => Promise<T>) {
    setPending(true);
    setMsg(null);
    try {
      const r: any = await fn();
      if (r && typeof r === 'object' && 'ok' in r && (r as any).ok === false) {
        const m = typeof (r as any).error === 'string' ? (r as any).error : 'error';
        setMsg(m);
      } else {
        setMsg('ok');
      }
    } catch (e) {
      try { setMsg(JSON.stringify(e)); } catch { setMsg(String(e)); }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative -mx-2 overflow-x-auto scroll-x-neon text-sm">
      <div className="inline-flex items-center gap-2 px-2 min-w-max">
        <div className="text-sm font-medium pr-2">{area} • Lights</div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
          <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => areaId ? lightTurnOnTarget({ area_id: [areaId] }) : turnOn(ids, 'light'))}>All On</button>
          <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => areaId ? callHAService({ domain: 'light', service: 'turn_off', target: { area_id: [areaId] } }) : lightTurnOff(ids))}>All Off</button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
          <span className="text-xs">T</span>
          <input className="neon-range" type="range" min={0} max={10} step={0.5} value={transition} onChange={(e) => setTransition(Number(e.currentTarget.value))} />
          <span className="text-xs w-8 text-center">{transition}</span>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
          <span className="text-xs">B</span>
          <input className="neon-range" type="range" min={0} max={100} value={brightness} onChange={(e) => setBrightness(Number(e.currentTarget.value))} />
          <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => areaId ? lightTurnOnTarget({ area_id: [areaId] }, { brightness_pct: brightness, transition }) : lightSetBrightnessPct(ids, brightness, transition))}>Set</button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
          <span className="text-xs">CT</span>
          <input type="number" value={ct} onChange={(e) => setCt(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-24" />
          <button disabled={pending || ct === ''} className="border rounded px-2 py-1" onClick={() => ct !== '' && run(() => areaId ? lightTurnOnTarget({ area_id: [areaId] }, { color_temp: Number(ct), transition }) : lightSetColorTemp(ids, Number(ct), transition))}>Set</button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
          <span className="text-xs">HS</span>
          <input type="number" placeholder="H" value={hsH} onChange={(e) => setHsH(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-16" />
          <input type="number" placeholder="S" value={hsS} onChange={(e) => setHsS(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-16" />
          <button disabled={pending || hsH === '' || hsS === ''} className="border rounded px-2 py-1" onClick={() => hsH !== '' && hsS !== '' && run(() => areaId ? lightTurnOnTarget({ area_id: [areaId] }, { hs_color: [Number(hsH), Number(hsS)], transition }) : lightSetHS(ids, Number(hsH), Number(hsS), transition))}>Set</button>
          <button disabled={pending} className="border rounded px-2 py-1" onClick={() => setWheelOpen(true)}>Wheel</button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
          <span className="text-xs">XY</span>
          <input type="number" step="0.001" placeholder="x" value={xyX} onChange={(e) => setXyX(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-20" />
          <input type="number" step="0.001" placeholder="y" value={xyY} onChange={(e) => setXyY(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-20" />
          <button disabled={pending || xyX === '' || xyY === ''} className="border rounded px-2 py-1" onClick={() => xyX !== '' && xyY !== '' && run(() => areaId ? lightTurnOnTarget({ area_id: [areaId] }, { xy_color: [Number(xyX), Number(xyY)], transition }) : callHAService({ domain: 'light', service: 'turn_on', entity_id: ids, data: { xy_color: [Number(xyX), Number(xyY)], transition } }))}>Set</button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
          <span className="text-xs">Color</span>
          <input type="color" value={colorHex} onChange={(e) => setColorHex(e.currentTarget.value)} />
          <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => {
            const v = colorHex.replace('#','');
            const r = parseInt(v.substring(0,2), 16);
            const g = parseInt(v.substring(2,4), 16);
            const b = parseInt(v.substring(4,6), 16);
            return areaId ? lightTurnOnTarget({ area_id: [areaId] }, { rgb_color: [r,g,b], transition }) : lightSetBrightnessPct(ids, brightness, transition).then(() => callHAService({ domain: 'light', service: 'turn_on', entity_id: ids, data: { rgb_color: [r,g,b], transition } }));
          })}>Apply</button>
        </div>

        {effectList.length > 0 && (
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <span className="text-xs">Effect</span>
            <select value={areaEffect} onChange={(e) => setAreaEffect(e.currentTarget.value)} className="border border-border rounded px-2 py-1 text-sm">
              <option value=""></option>
              {effectList.map((ef) => (<option key={ef} value={ef}>{ef}</option>))}
            </select>
            <button disabled={pending || !areaEffect} className="border rounded px-2 py-1" onClick={() => areaEffect && run(() => areaId ? lightTurnOnTarget({ area_id: [areaId] }, { effect: areaEffect, transition }) : callHAService({ domain: 'light', service: 'turn_on', entity_id: ids, data: { effect: areaEffect, transition } }))}>Apply</button>
          </div>
        )}

        {msg && <span className="text-xs text-foreground/60">{msg}</span>}
      </div>
      {wheelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-lg border border-primary bg-background p-4 shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <ColorWheel size={220} h={typeof hsH === 'number' ? hsH : 0} s={typeof hsS === 'number' ? hsS : 100} onChange={(H,S) => { setHsH(H); setHsS(S); }} />
              <div className="flex items-center gap-2">
                <button className="border rounded px-3 py-1" onClick={() => setWheelOpen(false)}>Cancel</button>
                <button className="border rounded px-3 py-1" onClick={() => run(() => areaId ? lightTurnOnTarget({ area_id: [areaId] }, { hs_color: [Number(hsH || 0), Number(hsS || 100)], transition }) : callHAService({ domain: 'light', service: 'turn_on', entity_id: ids, data: { hs_color: [Number(hsH || 0), Number(hsS || 100)], transition } })).then(() => setWheelOpen(false))}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
