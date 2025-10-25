import React from 'react';
import { headers } from 'next/headers';
import { Card } from '@frok/ui';
import DashboardQuickActions from './DashboardQuickActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const f = (p: string) => fetch(`${base}${p}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);

  const [health, github, ha, supabaseAuth, supabaseQuery] = await Promise.all([
    f('/api/ping'),
    f('/api/ping/mcp/github'),
    f('/api/ping/mcp/home-assistant'),
    f('/api/ping/supabase-db'),
    f('/api/ping/supabase-db-query'),
  ]);

  const statClass = (ok: boolean) => ok ? 'text-success' : 'text-danger';
  const ok = (x: any) => !!(x && x.ok === true);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <DashboardQuickActions />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 space-y-2">
          <div className="font-medium">System</div>
          <div className="text-sm">Overall: <span className={statClass(ok(health))}>{ok(health) ? 'ok' : 'fail'}</span></div>
          <div className="text-xs text-foreground/60">{health?.detail ?? ''}</div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="font-medium">GitHub</div>
          <div className="text-sm"><span className={statClass(ok(github))}>{ok(github) ? 'ok' : 'missing'}</span></div>
          <div className="text-xs text-foreground/60">{github?.detail ?? ''}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4 space-y-1">
          <div className="font-medium">Home Assistant</div>
          <div className={statClass(ok(ha))}>{ok(ha) ? 'ok' : 'missing'}</div>
          <div className="text-xs text-foreground/60">{ha?.detail ?? ''}</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="font-medium">Supabase Auth</div>
          <div className={statClass(ok(supabaseAuth))}>{ok(supabaseAuth) ? 'ok' : 'missing'}</div>
          <div className="text-xs text-foreground/60">{supabaseAuth?.detail ?? ''}</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="font-medium">Supabase Query</div>
          <div className={statClass(ok(supabaseQuery))}>{ok(supabaseQuery) ? 'ok' : 'missing'}</div>
          <div className="text-xs text-foreground/60">{supabaseQuery?.detail ?? ''}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4">Tasks placeholder</Card>
        <Card className="p-4">Notifications placeholder</Card>
        <Card className="p-4">Integrations placeholder</Card>
      </div>
    </div>
  );
}
