import { tool } from '@openai/agents';
import { z } from 'zod';

// Home Assistant types
type HAEntityState = {
  entity_id: string;
  state: string;
  attributes?: {
    friendly_name?: string;
    area_name?: string;
    [key: string]: unknown;
  };
};

type HAArea = {
  area_id: string;
  name: string;
};

// Cache for HA states and areas (5 second TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5000;

function getFromCache<T = unknown>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function getHA() {
  const base = (process.env["HOME_ASSISTANT_URL"] || process.env["HA_BASE_URL"] || '').trim();
  const token = (process.env["HOME_ASSISTANT_TOKEN"] || process.env["HA_TOKEN"] || '').trim();
  if (!base || !token) {
    console.error('[HA] Missing configuration: HOME_ASSISTANT_URL or HOME_ASSISTANT_TOKEN');
    return null;
  }
  return { base: base.replace(/\/$/, ''), token };
}

// Improved entity matching with fuzzy search
function scoreMatch(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower === queryLower) return 100;
  
  // Starts with
  if (textLower.startsWith(queryLower)) return 90;
  
  // Contains as whole word
  if (textLower.includes(` ${queryLower} `) || textLower.includes(` ${queryLower}`)) return 80;
  
  // Contains
  if (textLower.includes(queryLower)) return 70;
  
  // Word matches
  const textWords = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  const matchingWords = queryWords.filter(qw => textWords.some(tw => tw.includes(qw)));
  if (matchingWords.length > 0) {
    return 50 + (matchingWords.length / queryWords.length) * 20;
  }
  
  return 0;
}

// Home Assistant: search entities and areas
export const haSearch = tool({
  name: 'ha_search',
  description: 'Search Home Assistant entities (lights, switches, sensors, etc.) and areas by name. Returns the most relevant matches.',
  parameters: z.object({
    query: z.string().describe('Search term like "living room lights" or "bedroom"'),
    domain: z.string().nullable().describe('Optional: filter by domain (light, switch, climate, sensor, etc.)'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
  }),
  async execute({ query, domain, limit = 10 }) {
    console.log('[ha_search]', { query, domain, limit });
    
    const ha = getHA();
    if (!ha) {
      return JSON.stringify({ 
        error: 'Home Assistant is not configured. Set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables.',
        entities: [],
        areas: []
      });
    }

    try {
      const queryLower = query.toLowerCase();
      const domainLower = domain?.toLowerCase();

      // Try cache first for states
      let states = getFromCache<HAEntityState[]>('ha_states');
      if (!states) {
        const statesRes = await fetch(`${ha.base}/api/states`, {
          headers: { Authorization: `Bearer ${ha.token}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!statesRes.ok) {
          console.error('[ha_search] API error:', statesRes.status, await statesRes.text());
          throw new Error(`HA API error: ${statesRes.status}`);
        }
        
        states = await statesRes.json();
        setCache('ha_states', states);
      }

      // Score and filter entities
      const scoredEntities = (states || [])
        .map((s) => {
          const entityId = String(s.entity_id || '').toLowerCase();
          const friendlyName = String(s.attributes?.["friendly_name"] || '').toLowerCase();
          const areaName = String(s.attributes?.area_name || '').toLowerCase();
          
          // Calculate match score
          const idScore = scoreMatch(entityId, queryLower);
          const nameScore = scoreMatch(friendlyName, queryLower);
          const areaScore = scoreMatch(areaName, queryLower);
          const maxScore = Math.max(idScore, nameScore, areaScore);
          
          // Domain filter
          const matchesDomain = domainLower ? entityId.startsWith(`${domainLower}.`) : true;
          
          return {
            entity: s,
            score: maxScore,
            matchesDomain,
          };
        })
        .filter(item => item.score > 0 && item.matchesDomain)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => ({
          entity_id: item.entity.entity_id,
          friendly_name: item.entity.attributes?.["friendly_name"] || item.entity.entity_id,
          state: item.entity.state,
          domain: item.entity.entity_id.split('.')[0],
          area: item.entity.attributes?.area_name || null,
          score: item.score,
        }));

      // Try cache first for areas
      let areas = getFromCache<HAArea[]>('ha_areas');
      if (!areas) {
        const areasRes = await fetch(`${ha.base}/api/config/area_registry`, {
          headers: { Authorization: `Bearer ${ha.token}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        
        if (areasRes.ok) {
          areas = await areasRes.json();
          setCache('ha_areas', areas);
        } else {
          areas = [];
        }
      }

      const scoredAreas = (areas || [])
        .map(a => ({
          area: a,
          score: scoreMatch(String(a.name || ''), queryLower),
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => ({
          area_id: item.area.area_id,
          name: item.area.name,
          score: item.score,
        }));

      console.log('[ha_search] Results:', {
        entities: scoredEntities.length,
        areas: scoredAreas.length,
      });

      return JSON.stringify({
        entities: scoredEntities,
        areas: scoredAreas,
        query_processed: query,
      });

    } catch (error: unknown) {
      console.error('[ha_search] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({
        error: `Search failed: ${message}`,
        entities: [],
        areas: [],
      });
    }
  },
});

// Home Assistant: call service
export const haCall = tool({
  name: 'ha_call',
  description: 'Call a Home Assistant service to control devices. Common services: light.turn_on, light.turn_off, switch.turn_on, switch.turn_off, climate.set_temperature. Always verify the result and report success/failure accurately.',
  parameters: z.object({
    domain: z.string().describe('Service domain (light, switch, climate, media_player, etc.)'),
    service: z.string().describe('Service name (turn_on, turn_off, toggle, set_temperature, etc.)'),
    entity_id: z.union([z.string(), z.array(z.string())]).nullable().describe('Entity ID(s) to target (e.g., "light.living_room")'),
    area_id: z.union([z.string(), z.array(z.string())]).nullable().describe('Area ID(s) to target all devices in area'),
    data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable().describe('Additional parameters like brightness (0-255), temperature, etc.'),
  }),
  async execute({ domain, service, entity_id, area_id, data }) {
    console.log('[ha_call]', { domain, service, entity_id, area_id, data });
    
    const ha = getHA();
    if (!ha) {
      return JSON.stringify({
        ok: false,
        error: 'Home Assistant is not configured. Set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables.',
      });
    }

    try {
      const payload: Record<string, unknown> = {};

      // Add targeting
      if (entity_id) {
        payload['entity_id'] = entity_id;
      }
      if (area_id) {
        payload['area_id'] = area_id;
      }

      // Add service data
      if (data) {
        Object.assign(payload, data);
      }

      console.log('[ha_call] Payload:', payload);

      const response = await fetch(
        `${ha.base}/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ha.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ha_call] API error:', response.status, errorText);
        
        return JSON.stringify({
          ok: false,
          error: `Service call failed: ${response.status} - ${errorText}`,
          domain,
          service,
        });
      }

      const result = await response.json().catch(() => ([]));
      
      // Clear cache after state change
      cache.delete('ha_states');
      
      // Verify state change (for critical operations)
      if ((service === 'turn_on' || service === 'turn_off') && entity_id) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for state update
        
        const expectedState = service === 'turn_on' ? 'on' : 'off';
        const entities = Array.isArray(entity_id) ? entity_id : [entity_id];
        
        const verificationResults = await Promise.all(
          entities.map(async (id) => {
            try {
              const stateRes = await fetch(`${ha.base}/api/states/${id}`, {
                headers: { Authorization: `Bearer ${ha.token}` },
                cache: 'no-store',
              });
              
              if (stateRes.ok) {
                const state = await stateRes.json();
                return {
                  entity_id: id,
                  current_state: state.state,
                  expected_state: expectedState,
                  verified: state.state === expectedState,
                };
              }
              return { entity_id: id, verified: false, error: 'State fetch failed' };
            } catch {
              return { entity_id: id, verified: false, error: 'Verification failed' };
            }
          })
        );

        console.log('[ha_call] Verification:', verificationResults);

        return JSON.stringify({
          ok: true,
          data: result,
          verification: verificationResults,
          message: `Successfully called ${domain}.${service}`,
        });
      }

      console.log('[ha_call] Success:', result);

      return JSON.stringify({
        ok: true,
        data: result,
        message: `Successfully called ${domain}.${service}`,
      });

    } catch (error: unknown) {
      console.error('[ha_call] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({
        ok: false,
        error: `Service call failed: ${message}`,
        domain,
        service,
      });
    }
  },
});

// Export other tools unchanged
export { memoryAdd, memorySearch, webSearch } from './tools';
