import { FastifyInstance } from 'fastify';

export async function usersRoutes(app: FastifyInstance) {
  app.get('/users', async () => {
    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (base && anon) {
      try {
        const url = `${base.replace(/\/$/, '')}/rest/v1/users?select=id,name,email,role&limit=1000`;
        const r = await fetch(url, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}`, Accept: 'application/json' },
        });
        if (r.ok) {
          const users = await r.json();
          return { ok: true as const, users };
        }
      } catch {}
    }

    return {
      ok: true as const,
      users: [
        { id: 'u_1', name: 'Minki', role: 'owner', email: 'minki@example.com' },
        { id: 'u_2', name: 'Manager Bot', role: 'agent', email: 'manager@frok.local' },
        { id: 'u_3', name: 'Support', role: 'staff', email: 'support@frok.local' },
      ],
    };
  });
}
