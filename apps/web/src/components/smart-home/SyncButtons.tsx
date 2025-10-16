'use client';
import React, { useState } from 'react';

export default function SyncButtons() {
  const [pending, setPending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(path: string, label: string) {
    setPending(label);
    setMsg(null);
    try {
      const r = await fetch(path, { method: 'POST' });
      const text = await r.text();
      if (!r.ok) {
        setMsg(`HTTP ${r.status} ${r.statusText} — ${text}`);
      } else {
        setMsg(text);
      }
    } catch (e) {
      try { setMsg(JSON.stringify(e)); } catch { setMsg(String(e)); }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <button
        disabled={!!pending}
        className="border rounded px-3 py-2"
        onClick={() => run('/api/ha/sync/registries', 'registries')}
      >
        {pending === 'registries' ? 'Syncing…' : 'Sync Registries'}
      </button>
      <button
        disabled={!!pending}
        className="border rounded px-3 py-2"
        onClick={() => run('/api/ha/sync/snapshot', 'snapshot')}
      >
        {pending === 'snapshot' ? 'Snapshot…' : 'Take Snapshot'}
      </button>
      {msg && <span className="text-xs text-gray-500 break-all">{msg}</span>}
    </div>
  );
}
