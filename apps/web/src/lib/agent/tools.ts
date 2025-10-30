import { tool } from '@openai/agents';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

function getHA() {
  const base = (process.env["HOME_ASSISTANT_URL"] || process.env["HA_BASE_URL"] || '').trim();
  const token = (process.env["HOME_ASSISTANT_TOKEN"] || process.env["HA_TOKEN"] || '').trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

function getSupabase() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key);
}

let cachedOpenAI: OpenAI | null = null;

function getOpenAI() {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;
  if (!cachedOpenAI) {
    cachedOpenAI = new OpenAI({ apiKey });
  }
  return cachedOpenAI;
}

// Home Assistant: search entities and areas
export const haSearch = tool({
  name: 'ha_search',
  description: 'Search Home Assistant entities and areas by name. Returns matching lights, switches, sensors, etc.',
  parameters: z.object({
    query: z.string().describe('Search term like "living room" or "ceiling light"'),
    domain: z.string().nullable().describe('Optional: filter by domain (light, switch, climate, etc.)'),
  }),
  async execute({ query, domain }) {
    const ha = getHA();
    if (!ha) throw new Error('HA config missing');

    const queryLower = query.toLowerCase();
    const domainLower = domain?.toLowerCase();

    // Fetch states
    const statesRes = await fetch(`${ha.base}/api/states`, {
      headers: { Authorization: `Bearer ${ha.token}` },
      cache: 'no-store',
    });
    if (!statesRes.ok) throw new Error(`HA API error: ${statesRes.status}`);
    const states: any[] = await statesRes.json();

    // Filter entities
    const entities = states
      .filter((s) => {
        const entityId = String(s.entity_id || '').toLowerCase();
        const friendlyName = String(s.attributes?.["friendly_name"] || '').toLowerCase();
        const matchesQuery = entityId.includes(queryLower) || friendlyName.includes(queryLower);
        const matchesDomain = domainLower ? entityId.startsWith(`${domainLower}.`) : true;
        return matchesQuery && matchesDomain;
      })
      .slice(0, 20)
      .map((s) => ({
        entity_id: s.entity_id,
        friendly_name: s.attributes?.["friendly_name"] || s.entity_id,
        state: s.state,
        domain: s.entity_id.split('.')[0],
      }));

    // Fetch areas
    const areasRes = await fetch(`${ha.base}/api/config/area_registry`, {
      headers: { Authorization: `Bearer ${ha.token}` },
      cache: 'no-store',
    });
    const areas: any[] = areasRes.ok ? await areasRes.json() : [];
    const matchingAreas = areas
      .filter((a) => String(a.name || '').toLowerCase().includes(queryLower))
      .slice(0, 10)
      .map((a) => ({ area_id: a.area_id, name: a.name }));

    return JSON.stringify({ entities, areas: matchingAreas });
  },
});

// Home Assistant: call service
export const haCall = tool({
  name: 'ha_call',
  description: 'Call a Home Assistant service (e.g., turn on/off lights, set brightness). Only claim success if result.ok is true and data is non-empty.',
  parameters: z.object({
    domain: z.string().describe('Service domain (e.g., light, switch, climate)'),
    service: z.string().describe('Service name (e.g., turn_on, turn_off, set_temperature)'),
    entity_id: z.union([z.string(), z.array(z.string())]).nullable().describe('Entity ID(s) to target'),
    area_id: z.union([z.string(), z.array(z.string())]).nullable().describe('Area ID(s) to target'),
    target: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable().describe('Target object for advanced targeting'),
    data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable().describe('Additional data like brightness, temperature, etc.'),
  }),
  async execute({ domain, service, entity_id, area_id, target, data }) {
    const ha = getHA();
    if (!ha) throw new Error('HA config missing');

    const payload: any = { ...(data || {}) };
    if (entity_id) payload.entity_id = entity_id;
    if (area_id) payload.area_id = area_id;
    if (target) payload.target = target;

    const r = await fetch(`${ha.base}/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`HA call failed: ${r.status} ${text}`);
    }

    const result = await r.json().catch(() => null);
    return JSON.stringify({ ok: true, data: result });
  },
});

// Persistent memory: add
export const memoryAdd = tool({
  name: 'memory_add',
  description: 'Store a persistent memory for future reference. Use this to remember user preferences, important context, or facts.',
  parameters: z.object({
    content: z.string().describe('The fact or preference to store, in a single sentence'),
    tags: z.array(z.string()).nullable().describe('Optional tags for categorization'),
  }),
  async execute({ content, tags }) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase config missing');

    const openai = getOpenAI();
    if (!openai) throw new Error('OpenAI config missing');

    const user_id = 'system';
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    });

    const embedding = embeddingResponse.data[0]?.embedding;
    if (!embedding) {
      throw new Error('Failed to generate embedding for memory');
    }

    const { data, error } = await supabase
      .from('memories')
      .insert({ user_id, content, tags: tags || [], embedding })
      .select('id')
      .single();

    if (error) throw new Error(`Memory add failed: ${error.message}`);
    return JSON.stringify({ ok: true, id: data.id });
  },
});

// Persistent memory: search
export const memorySearch = tool({
  name: 'memory_search',
  description: 'Search previously stored memories by keyword. Returns matching memories with relevance scores.',
  parameters: z.object({
    query: z.string().describe('Search query to find relevant memories'),
    top_k: z.number().min(1).max(50).default(5).describe('Maximum number of results'),
  }),
  async execute({ query, top_k }) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase config missing');

    const openai = getOpenAI();
    if (!openai) throw new Error('OpenAI config missing');

    const limit = top_k ?? 5;
    const user_id = 'system';
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for memory search');
    }

    const rpcInput: Record<string, any> = {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
    };

    if (user_id) {
      rpcInput['user_id'] = user_id;
    }

    const { data, error } = await supabase.rpc('match_memories', rpcInput);

    if (error) throw new Error(`Memory search failed: ${error.message}`);

    const results = (data || []).map((m: any) => ({
      id: m.id,
      content: m.content,
      tags: m.tags || [],
      score: m.similarity ?? m.score ?? 0,
      created_at: m.created_at,
    }));

    return JSON.stringify({ results });
  },
});

// Web search
export const webSearch = tool({
  name: 'web_search',
  description: 'Search the web for current information. Use when you need real-time data or facts not in your training.',
  parameters: z.object({
    query: z.string().describe('Search query'),
    max_results: z.number().min(1).max(10).default(5).describe('Maximum number of results'),
  }),
  async execute({ query, max_results }) {
    const limit = max_results ?? 5;
    const tavilyKey = process.env["TAVILY_API_KEY"];

    if (tavilyKey) {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          max_results: limit,
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!res.ok) throw new Error(`Tavily API error: ${res.status}`);

      const data: any = await res.json();
      const results = (data.results || []).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.content || '',
      }));

      return JSON.stringify({ answer: data.answer || null, results });
    }

    // Fallback: DuckDuckGo
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (!res.ok) throw new Error('DuckDuckGo search failed');

    const html = await res.text();
    const results: { title: string; url: string; snippet: string }[] = [];
    const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null && results.length < limit) {
      results.push({ title: match[2] ?? '', url: match[1] ?? '', snippet: '' });
    }

    return JSON.stringify({ answer: null, results });
  },
});
