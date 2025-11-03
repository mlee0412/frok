/**
 * User-Specific Agent Tools Factory
 *
 * Creates tool instances bound to a specific user for proper data isolation.
 * This ensures memories and other user data are isolated per user.
 *
 * **CRITICAL**: Never use the hardcoded 'system' user_id from tools.ts
 * Always use this factory function to create user-specific tool instances.
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Memory search result type
type MemorySearchResult = {
  id: string;
  content: string;
  tags: string[];
  similarity?: number;
  score?: number;
  created_at: string;
};

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

/**
 * Create user-specific memory tools
 *
 * @param userId - Authenticated user's ID from Supabase
 * @returns Object with memoryAdd and memorySearch tools bound to this user
 */
export function createUserMemoryTools(userId: string) {
  // Memory Add Tool - User Specific
  const memoryAdd = tool({
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

      // Generate embedding for the memory
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content,
      });

      const embedding = embeddingResponse.data[0]?.embedding;
      if (!embedding) {
        throw new Error('Failed to generate embedding for memory');
      }

      // Insert memory with USER-SPECIFIC user_id (not 'system'!)
      const { data, error } = await supabase
        .from('memories')
        .insert({
          user_id: userId, // ✅ User-specific
          content,
          tags: tags || [],
          embedding,
        })
        .select('id')
        .single();

      if (error) throw new Error(`Memory add failed: ${error.message}`);

      return JSON.stringify({
        ok: true,
        id: data.id,
        message: `Memory stored successfully: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`,
      });
    },
  });

  // Memory Search Tool - User Specific
  const memorySearch = tool({
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

      // Generate query embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0]?.embedding;
      if (!queryEmbedding) {
        throw new Error('Failed to generate embedding for memory search');
      }

      // Search memories with USER-SPECIFIC user_id (not 'system'!)
      const rpcInput: Record<string, unknown> = {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        user_id: userId, // ✅ User-specific
      };

      const { data, error } = await supabase.rpc('match_memories', rpcInput);

      if (error) throw new Error(`Memory search failed: ${error.message}`);

      const results = (data as MemorySearchResult[] || []).map((m) => ({
        id: m.id,
        content: m.content,
        tags: m.tags || [],
        score: m.similarity ?? m.score ?? 0,
        created_at: m.created_at,
      }));

      if (results.length === 0) {
        return JSON.stringify({
          results: [],
          message: `No memories found matching "${query}". Try a different search term.`,
        });
      }

      return JSON.stringify({
        results,
        message: `Found ${results.length} relevant ${results.length === 1 ? 'memory' : 'memories'} for "${query}"`,
      });
    },
  });

  return { memoryAdd, memorySearch };
}

/**
 * Check if a user has any stored memories
 * Useful for onboarding or showing memory stats
 */
export async function getUserMemoryCount(userId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return count ?? 0;
}

/**
 * Get user's recent memories
 * Useful for showing in UI
 */
export async function getUserRecentMemories(userId: string, limit = 10): Promise<MemorySearchResult[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('memories')
    .select('id, content, tags, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map(m => ({
    id: m.id,
    content: m.content,
    tags: m.tags || [],
    created_at: m.created_at,
  }));
}
