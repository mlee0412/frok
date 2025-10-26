import { NextRequest } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const write = (s: string) => writer.write(encoder.encode(s));
  write('retry: 3000\n\n');

  let loopRunning = true;
  // Smoothing state
  let haConsecFail = 0;
  let haLastOk = false;
  let haLastLatency = 0;
  let dbConsecFail = 0;
  let dbLastOk = false;
  let dbLastLatency = 0;
  let dbCooldownUntil = 0; // epoch ms

  const supabase = (() => {
    try { return supabaseServiceClient(); } catch { return null; }
  })();

  async function pingHA(): Promise<{ ok: boolean; ms: number }> {
    const base = (process.env.HOME_ASSISTANT_URL || process.env.HA_BASE_URL || '').trim();
    const token = (process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || '').trim();
    if (!base || !token) return { ok: false, ms: 0 };
    const url = base.replace(/\/$/, '') + '/api/';
    const t0 = Date.now();
    try {
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 5000);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: ac.signal });
      clearTimeout(timeout);
      const ms = Date.now() - t0;
      return { ok: r.ok, ms };
    } catch {
      return { ok: false, ms: 0 };
    }
  }

  async function pingDB(): Promise<{ ok: boolean; ms: number }> {
    const t0 = Date.now();
    try {
      const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
      const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
      if (!base || !key) return { ok: false, ms: 0 };
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 5000);
      const r = await fetch(`${base.replace(/\/$/, '')}/rest/v1/fin_accounts?select=id&limit=1`, {
        method: 'HEAD',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: ac.signal,
      });
      clearTimeout(timeout);
      const ok = r.ok;
      const ms = Date.now() - t0;
      return { ok, ms };
    } catch {
      return { ok: false, ms: 0 };
    }
  }

  async function tick() {
    const now = Date.now();
    const effectiveDbPing = now < dbCooldownUntil
      ? Promise.resolve({ ok: dbLastOk, ms: dbLastLatency })
      : pingDB();
    const [ha, db] = await Promise.all([pingHA(), effectiveDbPing]);

    // HA smoothing
    if (ha.ok) {
      haConsecFail = 0;
      haLastOk = true;
      haLastLatency = ha.ms;
    } else {
      haConsecFail += 1;
      if (haConsecFail >= 2) haLastOk = false; // require 2 consecutive failures
    }

    // DB smoothing
    if (db.ok) {
      dbConsecFail = 0;
      dbLastOk = true;
      dbLastLatency = db.ms;
    } else {
      dbConsecFail += 1;
      if (dbConsecFail >= 2) dbLastOk = false; // require 2 consecutive failures
      if (dbConsecFail >= 3 && now >= dbCooldownUntil) {
        // Enter cooldown for 60s to avoid hammering a flapping edge
        dbCooldownUntil = now + 60_000;
      }
    }

    const payload = {
      ts: Date.now(),
      uptime_s: Math.round(typeof process?.uptime === 'function' ? process.uptime() : 0),
      ha_ok: haLastOk,
      ha_latency_ms: haLastLatency,
      db_ok: dbLastOk,
      db_latency_ms: dbLastLatency,
    };
    write(`event: system\n`);
    write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  // Start loop (avoid overlap)
  (async function loop() {
    while (loopRunning) {
      try { await tick(); } catch {}
      // wait 10–15s with jitter to reduce pressure
      const delay = 10000 + Math.floor(Math.random() * 5000);
      await new Promise((res) => setTimeout(res, delay));
    }
  })();
  const heartbeatTimer = setInterval(() => write(':\n\n'), 15000);
  // Send initial snapshot ASAP
  tick().catch(() => {});

  req.signal.addEventListener('abort', async () => {
    loopRunning = false;
    try { clearInterval(heartbeatTimer); } catch {}
    try { await writer.close(); } catch {}
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
