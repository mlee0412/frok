import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { supabaseServiceClient } from '@/lib/supabaseServer';

function getHA() {
  const base = (process.env.HOME_ASSISTANT_URL || process.env.HA_BASE_URL || '').trim();
  const token = (process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || '').trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token } as const;
}

async function haServiceCall(args: { domain: string; service: string; entity_id?: string | string[]; target?: any; area_id?: string | string[]; data?: Record<string, unknown> }) {
  const ha = getHA();
  if (!ha) return { ok: false, error: 'missing_home_assistant_env' };
  const payload: any = {};
  if (typeof args.entity_id !== 'undefined') payload.entity_id = args.entity_id;
  if (args.target) payload.target = args.target;
  if (typeof args.area_id !== 'undefined') {
    const arr = Array.isArray(args.area_id) ? args.area_id : [args.area_id];
    payload.target = { ...(payload.target || {}), area_id: arr };
  }
  if (args.data && typeof args.data === 'object') Object.assign(payload, args.data);
  try {
    const r = await fetch(`${ha.base}/api/services/${encodeURIComponent(args.domain)}/${encodeURIComponent(args.service)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return { ok: false, error: `ha_${r.status}${text ? ` ${text}` : ''}` };
    }
    const data = await r.json().catch(() => null);
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function POST(req: Request) {
  const { message, agentId, threadId } = await req.json().catch(() => ({ message: '', agentId: 'default', threadId: null }));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'missing_openai_key', detail: 'Set OPENAI_API_KEY in apps/web/.env.local' }, { status: 200 });
  }
  const openai = new OpenAI({ apiKey });
  const model = agentId === 'fast' ? 'gpt-4o-mini' : 'gpt-4o-mini';

  // Agent: Home Assistant tools (non-streaming, function-calling)
  if (agentId === 'ha' || agentId === 'ha-tools') {
    // Guardrails: tools must be enabled on the thread
    try {
      if (!threadId) {
        return new Response('Tools are disabled for this thread.', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, status: 200 });
      }
      const svc = supabaseServiceClient();
      let { data: th, error: thErr } = await (svc.from('chat_threads' as any) as any)
        .select('id, tools_enabled')
        .eq('id', threadId)
        .limit(1)
        .maybeSingle();
      if (thErr || !th?.tools_enabled) {
        // small retry to smooth out client->DB race after toggling
        await new Promise((r) => setTimeout(r, 400));
        const r2 = await (svc.from('chat_threads' as any) as any)
          .select('id, tools_enabled')
          .eq('id', threadId)
          .limit(1)
          .maybeSingle();
        th = r2.data; thErr = r2.error;
      }
      if (thErr || !th?.tools_enabled) {
        return new Response('Tools are disabled for this thread.', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, status: 200 });
      }
    } catch {}
    try {
      const sys = 'You are FROK Home Assistant agent. Use search_ha to discover entity_ids or areas before calling call_ha when needed. Only claim success if call_ha returns ok:true with a non-empty result array; otherwise ask the user to clarify which device/area to control.';
      const tools: any = [
        {
          type: 'function',
          function: {
            name: 'call_ha',
            description: 'Call a Home Assistant service with optional entity_id, area_id target, and data payload',
            parameters: {
              type: 'object',
              properties: {
                domain: { type: 'string', description: 'HA domain, e.g. light, switch, media_player' },
                service: { type: 'string', description: 'Service name, e.g. turn_on, turn_off' },
                entity_id: { type: ['string', 'array'], items: { type: 'string' }, nullable: true },
                area_id: { type: ['string', 'array'], items: { type: 'string' }, nullable: true },
                data: { type: 'object', nullable: true },
              },
              required: ['domain', 'service'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'search_ha',
            description: 'Search Home Assistant areas and entities by name. Useful to find entity_ids for a room or appliance.',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Free text like "living room" or "ceiling light"' },
                domain: { type: 'string', nullable: true, description: 'Optional domain to filter, e.g. light, switch, climate' },
              },
              required: ['query'],
            },
          },
        },
      ];

      const messages = [
        { role: 'system', content: sys },
        { role: 'user', content: String(message || '') },
      ];

      for (let i = 0; i < 5; i++) {
        const res = await openai.chat.completions.create({ model, messages, tools, tool_choice: 'auto' as any });
        const choice: any = res.choices?.[0];
        const msg = choice?.message || {};
        const tcs = msg.tool_calls || [];
        if (tcs.length) {
          // IMPORTANT: add the assistant message that requested tool_calls first
          messages.push(msg);
          for (const tc of tcs) {
            if (tc.function?.name === 'call_ha') {
              const args = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
              const result = await haServiceCall({
                domain: String(args.domain || ''),
                service: String(args.service || ''),
                entity_id: args.entity_id,
                area_id: args.area_id,
                target: args.target,
                data: args.data,
              });
              messages.push({ role: 'tool', tool_call_id: tc.id, name: 'call_ha', content: JSON.stringify(result) } as any);
            } else if (tc.function?.name === 'search_ha') {
              const args = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
              const query = String(args.query || '');
              const domain = args.domain ? String(args.domain) : undefined;
              const svc = supabaseServiceClient();
              const areasQ = (svc.from('ha_areas' as any) as any).select('area_id,name').ilike('name', `%${query}%`).limit(10);
              let entitiesQ = (svc.from('ha_entities' as any) as any).select('entity_id,name,area_id,domain').or(`name.ilike.%${query}%,entity_id.ilike.%${query}%`).limit(15);
              if (domain) entitiesQ = entitiesQ.eq('domain', domain);
              const [areasRes, entitiesRes] = await Promise.all([areasQ, entitiesQ]);
              const result = {
                ok: !areasRes.error && !entitiesRes.error,
                areas: areasRes.data || [],
                entities: entitiesRes.data || [],
                error: areasRes.error?.message || entitiesRes.error?.message || undefined,
              };
              messages.push({ role: 'tool', tool_call_id: tc.id, name: 'search_ha', content: JSON.stringify(result) } as any);
            }
          }
          continue; // ask model again
        }
        const content = msg.content?.toString() || '';
        return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, status: 200 });
      }
      return new Response('Done.', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, status: 200 });
    } catch (e) {
      const detail = (() => { try { return JSON.stringify(e); } catch { return String(e); } })();
      return NextResponse.json({ ok: false, error: 'openai_error', detail }, { status: 200 });
    }
  }

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are FROK Assistant. Be concise and helpful.' },
        { role: 'user', content: String(message || '') }
      ],
      temperature: 0.2,
      stream: true,
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of stream) {
            const token = part.choices?.[0]?.delta?.content || '';
            if (token) controller.enqueue(encoder.encode(token));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      status: 200,
    });
  } catch (e) {
    const detail = (() => { try { return JSON.stringify(e); } catch { return String(e); } })();
    return NextResponse.json({ ok: false, error: 'openai_error', detail }, { status: 200 });
  }
}
