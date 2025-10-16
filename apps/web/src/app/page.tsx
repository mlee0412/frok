'use client';
import { useEffect, useState } from 'react';

import type { Health } from '@frok/types';
import SystemStatus from '@/components/system-status';

function dot(color: string, title: string) {
  return <span title={title} className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${color}`} />;
}

export default function Home() {
  const [api, setApi] = useState<Health | { error: string } | null>(null);

  // Call Next's own API route (same origin) → server-side fetch to Fastify
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/ping', { cache: 'no-store' });
        const j = await r.json();
        setApi(j?.data ?? { error: 'No data' });
      } catch {
        setApi({ error: 'API not reachable' });
      }
    })();
  }, []);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const ok = api && 'ok' in api;
  const statusDot = ok
    ? dot('bg-emerald-400', 'Healthy')
    : api
    ? dot('bg-amber-400', 'Degraded / error')
    : dot('bg-gray-400', 'Loading');

  return (
    <div className="relative min-h-screen flex bg-gradient-to-br from-black via-[#020b16] to-[#00111f] text-white overflow-hidden">
      {/* sidebar */}
      <aside className="w-60 border-r border-white/10 backdrop-blur-sm bg-white/5 flex flex-col items-center py-8 z-10">
        <div className="text-2xl font-bold tracking-tight text-cyan-400 mb-8 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
          FROK
        </div>
        <nav className="flex flex-col space-y-4 w-full px-4">
          {[
            { label: 'Dashboard', href: '/' },
            { label: 'Users', href: '/users' },
            { label: 'Devices', href: '/devices' },
            { label: 'Finances', href: '/finances' },
            { label: 'Automation', href: '/automation' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-cyan-400/10 hover:text-cyan-300 transition"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto text-xs opacity-50">© {new Date().getFullYear()} FROK</div>
      </aside>

      {/* main */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-8 relative z-10">
        <p className="text-sm text-cyan-200/80">{greeting}, Minki 👋</p>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-cyan-400 drop-shadow-[0_0_25px_rgba(0,255,255,0.3)]">
          Welcome to FROK
        </h1>
        <p className="text-gray-400 mt-2">Your unified AI & automation hub</p>

        <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-xl backdrop-blur-sm text-left">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-cyan-300">API Status</h2>
            <div className="flex items-center text-xs text-gray-300">
              {statusDot}
              {ok ? 'OK' : api ? 'Error' : 'Loading'}
            </div>
          </div>
          <pre className="bg-black/40 rounded-lg p-3 text-sm overflow-x-auto text-gray-200">
            {JSON.stringify(api ?? { loading: true }, null, 2)}
          </pre>
        </div>
        <div className="mt-6 w-full max-w-md">
          <SystemStatus />
        </div>
      </main>
    </div>
  );
}
