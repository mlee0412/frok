import { FastifyInstance } from 'fastify';

export async function devicesRoutes(app: FastifyInstance) {
  app.get('/devices', async () => {
    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (base && anon) {
      try {
        const url = `${base.replace(/\/$/, '')}/rest/v1/devices?select=id,name,type,area,online,owner_id&limit=1000`;
        const r = await fetch(url, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}`, Accept: 'application/json' },
        });
        if (r.ok) {
          const devices = await r.json();
          return { ok: true as const, devices };
        }
      } catch {}
    }

    return {
      ok: true as const,
      devices: [
        { id: 'd_1', name: 'Living Room TV', type: 'media_player', online: true },
        { id: 'd_2', name: 'Hue Sync Box', type: 'light_sync', online: true },
        { id: 'd_3', name: 'RYSE Blinds', type: 'cover', online: false },
      ],
    };
  });
}
