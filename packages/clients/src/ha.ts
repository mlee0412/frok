import type { Result } from './base';

export type HATarget = { entity_id?: string[]; device_id?: string[]; area_id?: string[] };
export type HAServiceRequest = {
  domain: string;
  service: string;
  entity_id?: string | string[];
  target?: HATarget;
  data?: Record<string, unknown>;
};

export async function callHAService(req: HAServiceRequest): Promise<Result<{ ok: boolean; res?: unknown }>> {
  try {
    const r = await fetch(`/api/ha/service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      cache: 'no-store',
    });
    if (!r.ok) {
      let detail = '';
      try { detail = await r.text(); } catch {}
      const msg = `HTTP ${r.status} ${r.statusText}${detail ? ` — ${detail}` : ''}`;
      return { ok: false, error: msg };
    }
    const data = await r.json();
    return { ok: true, data };
  } catch (e: unknown) {
    const error = (() => {
      if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
        return (e as { message: string }).message;
      }
      try { return JSON.stringify(e); } catch { return String(e); }
    })();
    return { ok: false, error };
  }
}

export async function toggle(entity_id: string | string[], domain: 'light' | 'switch') {
  const r = await callHAService({ domain, service: 'toggle', entity_id });
  if (r.ok) return r;
  return callHAService({ domain: 'homeassistant', service: 'toggle', entity_id });
}

export async function turnOn(entity_id: string | string[], domain: 'light' | 'switch') {
  const r = await callHAService({ domain, service: 'turn_on', entity_id });
  if (r.ok) return r;
  return callHAService({ domain: 'homeassistant', service: 'turn_on', entity_id });
}

export async function turnOff(entity_id: string | string[], domain: 'light' | 'switch') {
  const r = await callHAService({ domain, service: 'turn_off', entity_id });
  if (r.ok) return r;
  return callHAService({ domain: 'homeassistant', service: 'turn_off', entity_id });
}

export async function mediaPlayPause(entity_id: string) {
  const r = await callHAService({ domain: 'media_player', service: 'media_play_pause', entity_id });
  if (r.ok) return r;
  const rp = await callHAService({ domain: 'media_player', service: 'media_play', entity_id });
  if (rp.ok) return rp;
  return callHAService({ domain: 'media_player', service: 'media_pause', entity_id });
}

export async function climateSetTemperature(entity_id: string | string[], temperature: number) {
  return callHAService({ domain: 'climate', service: 'set_temperature', entity_id, data: { temperature } });
}

export async function climateSetHvacMode(entity_id: string | string[], hvac_mode: string) {
  return callHAService({ domain: 'climate', service: 'set_hvac_mode', entity_id, data: { hvac_mode } });
}

export async function climateSetTemperatureRange(entity_id: string | string[], target_temp_low: number, target_temp_high: number) {
  return callHAService({
    domain: 'climate',
    service: 'set_temperature',
    entity_id,
    data: { target_temp_low, target_temp_high },
  });
}

export async function lightTurnOn(entity_id: string | string[], opts?: { brightness_pct?: number; color_temp?: number; hs_color?: [number, number]; rgb_color?: [number, number, number]; xy_color?: [number, number]; effect?: string; transition?: number }) {
  return callHAService({ domain: 'light', service: 'turn_on', entity_id, data: { ...(opts || {}) } });
}

export async function lightTurnOff(entity_id: string | string[]) {
  return callHAService({ domain: 'light', service: 'turn_off', entity_id });
}

export async function lightSetBrightnessPct(entity_id: string | string[], brightness_pct: number, transition?: number) {
  return callHAService({ domain: 'light', service: 'turn_on', entity_id, data: { brightness_pct, ...(typeof transition === 'number' ? { transition } : {}) } });
}

export async function lightSetColorTemp(entity_id: string | string[], color_temp: number, transition?: number) {
  return callHAService({ domain: 'light', service: 'turn_on', entity_id, data: { color_temp, ...(typeof transition === 'number' ? { transition } : {}) } });
}

export async function lightSetHS(entity_id: string | string[], h: number, s: number, transition?: number) {
  return callHAService({ domain: 'light', service: 'turn_on', entity_id, data: { hs_color: [h, s], ...(typeof transition === 'number' ? { transition } : {}) } });
}

export async function lightSetRGB(entity_id: string | string[], r: number, g: number, b: number, transition?: number) {
  return callHAService({ domain: 'light', service: 'turn_on', entity_id, data: { rgb_color: [r, g, b], ...(typeof transition === 'number' ? { transition } : {}) } });
}

export async function lightSetXY(entity_id: string | string[], x: number, y: number, transition?: number) {
  return callHAService({ domain: 'light', service: 'turn_on', entity_id, data: { xy_color: [x, y], ...(typeof transition === 'number' ? { transition } : {}) } });
}

export async function lightSetEffect(entity_id: string | string[], effect: string, transition?: number) {
  return callHAService({ domain: 'light', service: 'turn_on', entity_id, data: { effect, ...(typeof transition === 'number' ? { transition } : {}) } });
}

export async function lightTurnOnTarget(target: HATarget, data?: Record<string, unknown>) {
  return callHAService({ domain: 'light', service: 'turn_on', target, data });
}

export async function mediaVolumeSet(entity_id: string, volume_level: number) {
  return callHAService({ domain: 'media_player', service: 'volume_set', entity_id, data: { volume_level } });
}

export async function mediaVolumeMute(entity_id: string, is_volume_muted: boolean) {
  return callHAService({ domain: 'media_player', service: 'volume_mute', entity_id, data: { is_volume_muted } });
}

export async function mediaNext(entity_id: string) {
  return callHAService({ domain: 'media_player', service: 'media_next_track', entity_id });
}

export async function mediaPrevious(entity_id: string) {
  return callHAService({ domain: 'media_player', service: 'media_previous_track', entity_id });
}

export async function mediaTurnOn(entity_id: string) {
  return callHAService({ domain: 'media_player', service: 'turn_on', entity_id });
}

export async function mediaTurnOff(entity_id: string) {
  return callHAService({ domain: 'media_player', service: 'turn_off', entity_id });
}

export async function coverOpen(entity_id: string | string[]) {
  return callHAService({ domain: 'cover', service: 'open_cover', entity_id });
}

export async function coverClose(entity_id: string | string[]) {
  return callHAService({ domain: 'cover', service: 'close_cover', entity_id });
}

export async function coverStop(entity_id: string | string[]) {
  return callHAService({ domain: 'cover', service: 'stop_cover', entity_id });
}

export async function sceneTurnOn(entity_id: string | string[]) {
  return callHAService({ domain: 'scene', service: 'turn_on', entity_id });
}

export async function scriptTurnOn(entity_id: string | string[], data?: Record<string, unknown>) {
  return callHAService({ domain: 'script', service: 'turn_on', entity_id, data });
}
