import React from 'react';
import { headers } from 'next/headers';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GithubPage() {
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

  const user = userRes?.user || null;
  const rate = rateRes?.limits?.resources?.core?.remaining ?? null;
  const repos: Array<{ id: string | number; name?: string; full_name?: string; url?: string }>
    = Array.isArray(reposRes?.repos) ? reposRes.repos : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">GitHub</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="p-4 space-y-1 text-sm">
            <div className="font-medium">User</div>
            <div>{user?.login || user?.name || 'n/a'}</div>
            <div>Rate remaining: {typeof rate === 'number' ? rate : 'n/a'}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 space-y-2">
            <div className="font-medium mb-1">Repos</div>
            <div className="grid gap-1 text-sm">
              {repos.slice(0, 20).map((r) => (
                <a key={String(r.id)} href={r.url} className="text-primary hover:underline">
                  {r.full_name || r.name || ''}
                </a>
              ))}
              {repos.length === 0 && <div className="text-foreground/60">none</div>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
