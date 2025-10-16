import React from 'react';
import SystemStatus from '@/components/system-status';
import { headers } from 'next/headers';

const LINKS = [
  { name: 'Web Health', href: '/api/ping' },
  { name: 'Supabase', href: '/api/ping/supabase' },
  { name: 'Supabase Service', href: '/api/ping/supabase-db' },
  { name: 'Supabase DB Query (users)', href: '/api/ping/supabase-db-query' },
  { name: 'GitHub', href: '/api/ping/mcp/github' },
  { name: 'Home Assistant', href: '/api/ping/mcp/home-assistant' }
];

function EnvRow({ name }: { name: string }) {
  const value = process.env[name];
  const present = !!(value && String(value).trim());
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{name}</span>
      <span className={present ? 'text-green-600' : 'text-red-600'}>{present ? 'present' : 'missing'}</span>
    </div>
  );
}

export default async function SystemPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const f = (p: string) => fetch(`${base}${p}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
  const [userRes, rateRes, reposRes] = await Promise.all([
    f('/api/github/user'),
    f('/api/github/rate_limit'),
    f('/api/github/repos'),
  ]);

  const ghUser = userRes?.ok ? (userRes.user?.login || userRes.user?.name || '') : '';
  const ghRate = rateRes?.ok ? rateRes.limits?.resources?.core?.remaining : undefined;
  const repos: { id: string | number; name?: string; full_name?: string; url?: string }[] =
    Array.isArray(reposRes?.repos) ? (reposRes.repos as { id: string | number; name?: string; full_name?: string; url?: string }[]) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">System</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl p-4 border shadow-sm">
          <div className="font-medium mb-3">Status</div>
          <SystemStatus />
        </div>

        <div className="rounded-2xl p-4 border shadow-sm">
          <div className="font-medium mb-3">Endpoints</div>
          <div className="grid gap-2">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} className="text-cyan-400 hover:underline text-sm">
                {l.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4 border shadow-sm">
        <div className="font-medium mb-3">GitHub</div>
        <div className="text-sm">
          <div>User: {ghUser || 'n/a'}</div>
          <div>Rate remaining: {typeof ghRate === 'number' ? ghRate : 'n/a'}</div>
        </div>
        <div className="mt-3 grid gap-1">
          {repos.slice(0, 5).map((r) => (
            <a key={String(r.id)} href={r.url} className="text-cyan-400 hover:underline text-sm">
              {r.full_name || r.name || ''}
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 border shadow-sm">
        <div className="font-medium mb-3">Environment (presence only)</div>
        <div className="grid gap-2">
          <EnvRow name="NEXT_PUBLIC_SUPABASE_URL" />
          <EnvRow name="NEXT_PUBLIC_SUPABASE_ANON_KEY" />
          <EnvRow name="GITHUB_TOKEN" />
          <EnvRow name="HOME_ASSISTANT_URL" />
          <EnvRow name="HOME_ASSISTANT_TOKEN" />
          <EnvRow name="HA_BASE_URL" />
          <EnvRow name="HA_TOKEN" />
        </div>
      </div>
    </div>
  );
}
