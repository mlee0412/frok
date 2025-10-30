export type Device = {
  id: string;
  name: string;
  type?: 'light' | 'media_player' | 'climate' | 'sensor' | 'switch' | 'cover' | 'scene' | 'script' | 'other';
  area?: string;
  area_id?: string;
  online?: boolean;
  state?: string;
  attrs?: Record<string, unknown>;
};

export async function getDevices(): Promise<Device[]> {
  try {
    const r = await fetch('/api/devices', { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j)) return j as Device[];
    }
  } catch {}

  return [];
}
