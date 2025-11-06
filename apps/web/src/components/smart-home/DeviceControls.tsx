'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Device } from '@frok/clients';
import ColorWheel from './ColorWheel';
import { ThermostatDial } from './ThermostatDial';
import { DebouncedSlider } from './DebouncedSlider';
import {
  validateBrightness,
  validateColorTemp,
  validateRGB,
  validateHS,
  validateTemperature,
  validateTemperatureRange,
  validateTransition,
  hexToRGB
} from '@/lib/homeassistant/validation';
import {
  toggle,
  turnOn,
  turnOff,
  mediaPlayPause,
  climateSetTemperature,
  climateSetHvacMode,
  climateSetTemperatureRange,
  lightSetBrightnessPct,
  lightSetColorTemp,
  lightSetHS,
  lightSetRGB,
  lightSetXY,
  lightSetEffect,
  sceneTurnOn,
  scriptTurnOn,
  mediaVolumeSet,
  mediaVolumeMute,
  mediaNext,
  mediaPrevious,
  mediaTurnOn,
  mediaTurnOff,
  coverOpen,
  coverClose,
  coverStop,
} from '@frok/clients';

function domainFrom(device: Device): 'light' | 'switch' | 'media_player' | 'climate' | 'sensor' | 'cover' | 'scene' | 'script' | 'other' {
  if (device.type) return device.type;
  const id = device.id || '';
  const prefix = id.includes('.') ? id.split('.')[0] : '';
  switch (prefix) {
    case 'light':
    case 'switch':
    case 'media_player':
    case 'climate':
    case 'sensor':
    case 'cover':
    case 'scene':
    case 'script':
      return prefix;
    default:
      return 'other';
  }
}

export default function DeviceControls({ device }: { device: Device }) {
  const d = domainFrom(device);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const [temp, setTemp] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const t = (a['temperature'] ?? a['target_temp'] ?? a['target_temperature']) as number | undefined;
    return typeof t === 'number' ? t : '';
  });
  const [wheelOpen, setWheelOpen] = useState(false);
  const [dialOpen, setDialOpen] = useState(false);
  const [tempLow, setTempLow] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const v = a['target_temp_low'] as number | undefined;
    return typeof v === 'number' ? v : '';
  });
  const [tempHigh, setTempHigh] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const v = a['target_temp_high'] as number | undefined;
    return typeof v === 'number' ? v : '';
  });
  const [hvac, setHvac] = useState<string>(() => {
    const a = device.attrs || {};
    const m = a['hvac_mode'] as string | undefined;
    return m || '';
  });
  const [brightness, setBrightness] = useState<number>(() => {
    const a = device.attrs || {};
    const b = a['brightness'] as number | undefined;
    if (typeof b === 'number') return Math.round((b / 255) * 100);
    const bp = a['brightness_pct'] as number | undefined;
    return typeof bp === 'number' ? bp : 100;
  });
  const [colorTemp, setColorTemp] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const ct = a['color_temp'] as number | undefined;
    return typeof ct === 'number' ? ct : '';
  });
  const [hsH, setHsH] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const hs = a['hs_color'] as [number, number] | undefined;
    return Array.isArray(hs) && typeof hs[0] === 'number' ? hs[0] : '';
  });
  const [hsS, setHsS] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const hs = a['hs_color'] as [number, number] | undefined;
    return Array.isArray(hs) && typeof hs[1] === 'number' ? hs[1] : '';
  });
  const [rgbR, setRgbR] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const rgb = a['rgb_color'] as [number, number, number] | undefined;
    return Array.isArray(rgb) && typeof rgb[0] === 'number' ? rgb[0] : '';
  });
  const [rgbG, setRgbG] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const rgb = a['rgb_color'] as [number, number, number] | undefined;
    return Array.isArray(rgb) && typeof rgb[1] === 'number' ? rgb[1] : '';
  });
  const [rgbB, setRgbB] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const rgb = a['rgb_color'] as [number, number, number] | undefined;
    return Array.isArray(rgb) && typeof rgb[2] === 'number' ? rgb[2] : '';
  });
  const [xyX, setXyX] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const xy = a['xy_color'] as [number, number] | undefined;
    return Array.isArray(xy) && typeof xy[0] === 'number' ? xy[0] : '';
  });
  const [xyY, setXyY] = useState<number | ''>(() => {
    const a = device.attrs || {};
    const xy = a['xy_color'] as [number, number] | undefined;
    return Array.isArray(xy) && typeof xy[1] === 'number' ? xy[1] : '';
  });
  const [effect, setEffect] = useState<string>(() => {
    const a = device.attrs || {};
    const e = a['effect'] as string | undefined;
    return e || '';
  });
  const [transition, setTransition] = useState<number>(0);
  const [colorHex, setColorHex] = useState<string>(() => {
    const a = device.attrs || {};
    const rgb = a['rgb_color'] as [number, number, number] | undefined;
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    if (Array.isArray(rgb) && rgb.length === 3) return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
    return '#ffffff';
  });
  const [volume, setVolume] = useState<number>(() => {
    const a = device.attrs || {};
    const v = a['volume_level'] as number | undefined;
    return typeof v === 'number' ? v : 0.5;
  });
  const [muted, setMuted] = useState<boolean>(() => {
    const a = device.attrs || {};
    const m = a['is_volume_muted'] as boolean | undefined;
    return !!m;
  });

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setMsg(null);
    try {
      const r: unknown = await fn();
      if (typeof r === 'object' && r !== null && 'ok' in (r as Record<string, unknown>)) {
        const ok = (r as Record<string, unknown>)['ok'] === true;
        if (ok) { setMsg('ok'); router.refresh(); }
        else {
          const errVal = (r as Record<string, unknown>)['error'];
          const m = typeof errVal === 'string' ? errVal : 'error';
          setMsg(m);
        }
      } else {
        setMsg('ok');
      }
    } catch {
      setMsg('error');
    } finally {
      setPending(false);
    }
  }

  if (d === 'light' || d === 'switch') {
    const aLight = (device.attrs || {}) as Record<string, unknown>;
    const scmRaw = aLight['supported_color_modes'];
    const scm = Array.isArray(scmRaw) ? (scmRaw as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    const supportsBrightness = scm.includes('brightness') || typeof aLight['brightness'] === 'number' || d === 'light';
    const supportsCT = scm.includes('color_temp') || typeof aLight['min_mireds'] === 'number' || typeof aLight['max_mireds'] === 'number' || typeof aLight['color_temp'] === 'number';
    const supportsHS = scm.includes('hs');
    const supportsRGB = scm.includes('rgb') || scm.includes('rgbw') || scm.includes('rgbww');
    const supportsXY = scm.includes('xy');
    const effectListRaw = aLight['effect_list'];
    const effectList = Array.isArray(effectListRaw) ? (effectListRaw as unknown[]).filter((ef): ef is string => typeof ef === 'string') : [];
    const supportsEffect = effectList.length > 0;
    return (
      <div className="relative -mx-2 overflow-x-auto scroll-x-neon text-sm">
        <div className="inline-flex items-center gap-2 px-2 min-w-max">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1" role="group" aria-label={`Basic controls for ${device.name}`}>
            <button disabled={pending} className="border border-border rounded px-2 py-1 text-foreground bg-surface hover:bg-surface/80 transition-colors disabled:opacity-50" onClick={() => run(() => toggle(device.id, d))} aria-label={`Toggle ${device.name}`}>Toggle</button>
            <button disabled={pending} className="border border-border rounded px-2 py-1 text-foreground bg-surface hover:bg-surface/80 transition-colors disabled:opacity-50" onClick={() => run(() => turnOn(device.id, d))} aria-label={`Turn on ${device.name}`}>On</button>
            <button disabled={pending} className="border border-border rounded px-2 py-1 text-foreground bg-surface hover:bg-surface/80 transition-colors disabled:opacity-50" onClick={() => run(() => turnOff(device.id, d))} aria-label={`Turn off ${device.name}`}>Off</button>
          </div>
          {d === 'light' && (
            <>
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-xs">T</span>
                <input className="neon-range" type="range" min={0} max={10} step={0.5} value={transition} onChange={(e) => setTransition(Number(e.currentTarget.value))} />
                <span className="text-xs w-8 text-center">{transition}</span>
              </div>
              {supportsBrightness && (
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                <DebouncedSlider
                  value={brightness}
                  onChange={(value) => setBrightness(value)}
                  onChangeEnd={(value) => run(() => {
                    try {
                      const validBrightness = validateBrightness(value);
                      const validTransition = validateTransition(transition);
                      return lightSetBrightnessPct(device.id, validBrightness, validTransition);
                    } catch (error) {
                      setMsg(error instanceof Error ? error.message : 'Invalid value');
                      throw error;
                    }
                  })}
                  min={0}
                  max={100}
                  step={1}
                  disabled={pending}
                  className="neon-range w-24"
                  label="B"
                  ariaLabel="Brightness control"
                  debounceMs={300}
                />
              </div>
              )}
              {supportsCT && (
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-xs">CT</span>
                <input type="number" value={colorTemp} onChange={(e) => setColorTemp(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-24 bg-background text-foreground" />
                <button disabled={pending || colorTemp === ''} className="border rounded px-2 py-1" onClick={() => colorTemp !== '' && run(() => {
                  try {
                    const a = (device.attrs || {}) as Record<string, unknown>;
                    const min = typeof a['min_mireds'] === 'number' ? (a['min_mireds'] as number) : undefined;
                    const max = typeof a['max_mireds'] === 'number' ? (a['max_mireds'] as number) : undefined;
                    const validColorTemp = validateColorTemp(Number(colorTemp), min, max);
                    const validTransition = validateTransition(transition);
                    return lightSetColorTemp(device.id, validColorTemp, validTransition);
                  } catch (error) {
                    setMsg(error instanceof Error ? error.message : 'Invalid value');
                    throw error;
                  }
                })}>Set</button>
              </div>
              )}
              {supportsHS && (
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-xs">HS</span>
                <input type="number" placeholder="H" value={hsH} onChange={(e) => setHsH(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-16" />
                <input type="number" placeholder="S" value={hsS} onChange={(e) => setHsS(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-16" />
                <button disabled={pending || hsH === '' || hsS === ''} className="border rounded px-2 py-1" onClick={() => hsH !== '' && hsS !== '' && run(() => {
                  try {
                    const [validH, validS] = validateHS(Number(hsH), Number(hsS));
                    const validTransition = validateTransition(transition);
                    return lightSetHS(device.id, validH, validS, validTransition);
                  } catch (error) {
                    setMsg(error instanceof Error ? error.message : 'Invalid value');
                    throw error;
                  }
                })}>Set</button>
                <button disabled={pending} className="border rounded px-2 py-1" onClick={() => setWheelOpen(true)}>Wheel</button>
              </div>
              )}
              {supportsRGB && (
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-xs">RGB</span>
                <input type="number" placeholder="R" value={rgbR} onChange={(e) => setRgbR(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-16" />
                <input type="number" placeholder="G" value={rgbG} onChange={(e) => setRgbG(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-16" />
                <input type="number" placeholder="B" value={rgbB} onChange={(e) => setRgbB(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-16" />
                <button disabled={pending || rgbR === '' || rgbG === '' || rgbB === ''} className="border rounded px-2 py-1" onClick={() => rgbR !== '' && rgbG !== '' && rgbB !== '' && run(() => {
                  try {
                    const [validR, validG, validB] = validateRGB(Number(rgbR), Number(rgbG), Number(rgbB));
                    const validTransition = validateTransition(transition);
                    return lightSetRGB(device.id, validR, validG, validB, validTransition);
                  } catch (error) {
                    setMsg(error instanceof Error ? error.message : 'Invalid value');
                    throw error;
                  }
                })}>Set</button>
              </div>
              )}
              {supportsRGB && (
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-xs">Color</span>
                <input type="color" value={colorHex} onChange={(e) => setColorHex(e.currentTarget.value)} />
                <button disabled={pending} className="border border-border rounded px-2 py-1 text-foreground bg-surface hover:bg-surface/80 transition-colors disabled:opacity-50" onClick={() => run(() => {
                  try {
                    const [validR, validG, validB] = hexToRGB(colorHex);
                    const validTransition = validateTransition(transition);
                    return lightSetRGB(device.id, validR, validG, validB, validTransition);
                  } catch (error) {
                    setMsg(error instanceof Error ? error.message : 'Invalid color');
                    throw error;
                  }
                })}>Apply</button>
              </div>
              )}
              {supportsXY && (
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-xs">XY</span>
                <input type="number" step="0.001" placeholder="x" value={xyX} onChange={(e) => setXyX(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-20" />
                <input type="number" step="0.001" placeholder="y" value={xyY} onChange={(e) => setXyY(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-20" />
                <button disabled={pending || xyX === '' || xyY === ''} className="border rounded px-2 py-1" onClick={() => xyX !== '' && xyY !== '' && run(() => lightSetXY(device.id, Number(xyX), Number(xyY), transition))}>Set</button>
              </div>
              )}
              {supportsEffect && (
                <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
                  <span className="text-xs">Effect</span>
                  <select value={effect} onChange={(e) => setEffect(e.currentTarget.value)} className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground">
                    <option value=""></option>
                    {effectList.map((ef) => (
                      <option key={ef} value={ef}>{ef}</option>
                    ))}
                  </select>
                  <button disabled={pending || !effect} className="border rounded px-2 py-1" onClick={() => effect && run(() => lightSetEffect(device.id, effect, transition))}>Apply</button>
                </div>
              )}
            </>
          )}
          {msg && <span className="text-xs text-foreground/60">{msg}</span>}
        </div>
        {wheelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="rounded-lg border border-primary bg-surface p-4 shadow-xl">
              <div className="flex flex-col items-center gap-3">
                <ColorWheel size={200} h={typeof hsH === 'number' ? hsH : 0} s={typeof hsS === 'number' ? hsS : 100} onChange={(H,S) => { setHsH(H); setHsS(S); }} />
                <div className="flex items-center gap-2">
                  <button className="border border-border rounded px-3 py-1 text-foreground bg-surface hover:bg-surface/80 transition-colors" onClick={() => setWheelOpen(false)}>Cancel</button>
                  <button className="border border-primary rounded px-3 py-1 text-primary bg-primary/10 hover:bg-primary/20 transition-colors" onClick={() => run(() => lightSetHS(device.id, Number(hsH || 0), Number(hsS || 100), transition)).then(() => setWheelOpen(false))}>Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (d === 'media_player') {
    return (
      <div className="relative -mx-2 overflow-x-auto text-sm">
        <div className="inline-flex items-center gap-2 px-2 min-w-max">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => mediaPlayPause(device.id))}>Play/Pause</button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <DebouncedSlider
              value={volume * 100} // Convert to percentage
              onChange={(value) => setVolume(value / 100)}
              onChangeEnd={(value) => run(() => mediaVolumeSet(device.id, value / 100))}
              min={0}
              max={100}
              step={1}
              disabled={pending}
              className="w-24"
              label="Vol"
              ariaLabel="Volume control"
              debounceMs={200}
            />
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(async () => { setMuted(!muted); return mediaVolumeMute(device.id, !muted); })}>{muted ? 'Unmute' : 'Mute'}</button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => mediaPrevious(device.id))}>Prev</button>
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => mediaNext(device.id))}>Next</button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => mediaTurnOn(device.id))}>Power On</button>
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => mediaTurnOff(device.id))}>Power Off</button>
          </div>
          {msg && <span className="text-xs text-foreground/60">{msg}</span>}
        </div>
      </div>
    );
  }

  if (d === 'climate') {
    const a = (device.attrs || {}) as Record<string, unknown>;
    const modes = Array.isArray(a['hvac_modes']) ? (a['hvac_modes'] as string[]) : [];
    const supportsRange = typeof a['target_temp_low'] === 'number' && typeof a['target_temp_high'] === 'number';
    return (
      <div className="relative -mx-2 overflow-x-auto text-sm">
        <div className="inline-flex items-center gap-2 px-2 min-w-max">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <select value={hvac} onChange={(e) => setHvac(e.currentTarget.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">hvac</option>
              {modes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button disabled={pending || !hvac} className="border rounded px-2 py-1" onClick={() => hvac && run(() => climateSetHvacMode(device.id, hvac))}>Set Mode</button>
          </div>
          {!supportsRange && (
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
              <input type="number" step="0.5" value={temp} onChange={(e) => setTemp(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-24 bg-background text-foreground" placeholder="Temp" />
              <button disabled={pending || temp === ''} className="border rounded px-2 py-1" onClick={() => temp !== '' && run(() => {
                try {
                  const validTemp = validateTemperature(Number(temp));
                  return climateSetTemperature(device.id, validTemp);
                } catch (error) {
                  setMsg(error instanceof Error ? error.message : 'Invalid temperature');
                  throw error;
                }
              })}>Set</button>
              <button disabled={pending} className="border rounded px-2 py-1" onClick={() => setDialOpen(true)}>Dial</button>
            </div>
          )}
          {supportsRange && (
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
              <input type="number" step="0.5" value={tempLow} onChange={(e) => setTempLow(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-24 bg-background text-foreground" placeholder="Low" />
              <input type="number" step="0.5" value={tempHigh} onChange={(e) => setTempHigh(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} className="border border-border rounded px-2 py-1 w-24 bg-background text-foreground" placeholder="High" />
              <button disabled={pending || tempLow === '' || tempHigh === ''} className="border rounded px-2 py-1" onClick={() => tempLow !== '' && tempHigh !== '' && run(() => {
                try {
                  const [validLow, validHigh] = validateTemperatureRange(Number(tempLow), Number(tempHigh));
                  return climateSetTemperatureRange(device.id, validLow, validHigh);
                } catch (error) {
                  setMsg(error instanceof Error ? error.message : 'Invalid temperature range');
                  throw error;
                }
              })}>Set</button>
            </div>
          )}
          {msg && <span className="text-xs text-foreground/60">{msg}</span>}
        </div>
        {dialOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="rounded-lg border border-primary bg-surface p-6 shadow-xl">
              <div className="flex flex-col items-center gap-4">
                <h3 className="text-lg font-semibold text-foreground">Set Temperature</h3>
                <ThermostatDial
                  size={240}
                  value={typeof temp === 'number' ? temp : 20}
                  min={10}
                  max={35}
                  step={0.5}
                  onChange={(value) => setTemp(value)}
                />
                <div className="flex items-center gap-3 w-full">
                  <button className="flex-1 border rounded-lg px-4 py-2 text-foreground hover:bg-surface transition-colors" onClick={() => setDialOpen(false)}>Cancel</button>
                  <button className="flex-1 border border-primary rounded-lg px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium" onClick={() => run(() => climateSetTemperature(device.id, Number(temp || 20))).then(() => setDialOpen(false))}>Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (d === 'cover') {
    const sf = Number(((device.attrs || {})['supported_features'] as number | string | undefined) ?? 0);
    const canStop = (sf & 8) === 8;
    return (
      <div className="relative -mx-2 overflow-x-auto text-sm">
        <div className="inline-flex items-center gap-2 px-2 min-w-max">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => coverOpen(device.id))}>Open</button>
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => coverClose(device.id))}>Close</button>
            {canStop && (
              <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => coverStop(device.id))}>Stop</button>
            )}
          </div>
          {msg && <span className="text-xs text-foreground/60">{msg}</span>}
        </div>
      </div>
    );
  }

  if (d === 'scene') {
    return (
      <div className="relative -mx-2 overflow-x-auto text-sm">
        <div className="inline-flex items-center gap-2 px-2 min-w-max">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => sceneTurnOn(device.id))}>Activate</button>
          </div>
          {msg && <span className="text-xs text-foreground/60">{msg}</span>}
        </div>
      </div>
    );
  }

  if (d === 'script') {
    return (
      <div className="relative -mx-2 overflow-x-auto text-sm">
        <div className="inline-flex items-center gap-2 px-2 min-w-max">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
            <button disabled={pending} className="border rounded px-2 py-1" onClick={() => run(() => scriptTurnOn(device.id))}>Run</button>
          </div>
          {msg && <span className="text-xs text-foreground/60">{msg}</span>}
        </div>
      </div>
    );
  }

  return null;
}
