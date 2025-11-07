import { tool } from '@openai/agents';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

/**
 * Enhanced Memory Search Tool - User-Specific Factory
 *
 * Phase 2.1: Hybrid Search Implementation
 * - Vector similarity search (semantic meaning)
 * - Keyword search (exact matches)
 * - Tag filtering
 * - Date range filtering
 * - Weighted relevance scoring
 *
 * Use Cases:
 * - Find memories by semantic meaning: "What did I say about coffee preferences?"
 * - Find by exact keywords: "Python tutorial"
 * - Filter by tags: ["work", "project-x"]
 * - Filter by date: created after January 1, 2025
 * - Combine all filters for precise search
 *
 * CRITICAL: This tool must be created with a specific userId to ensure data isolation
 */

// Types
type MemorySearchResult = {
  id: string;
  content: string;
  tags: string[];
  similarity?: number;
  score?: number;
  created_at: string;
};

type ScoredMemory = {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
  vector_score: number;    // Similarity from vector search (0-1)
  keyword_score: number;   // Match quality from keyword search (0-1)
  tag_boost: number;       // Bonus for tag matches (0-0.2)
  recency_boost: number;   // Bonus for recent memories (0-0.1)
  final_score: number;     // Weighted combined score
};

// Utility functions
function getSupabase() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) return null;
  return createClient(url, key);
}

let cachedOpenAI: OpenAI | null = null;

function getOpenAI() {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) return null;
  if (!cachedOpenAI) {
    cachedOpenAI = new OpenAI({ apiKey });
  }
  return cachedOpenAI;
}

/**
 * Calculate keyword match score based on how well the content matches the query
 */
function calculateKeywordScore(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

  // Exact match (full query appears in content)
  if (contentLower.includes(queryLower)) {
    return 1.0;
  }

  // Starts with query
  if (contentLower.startsWith(queryLower)) {
    return 0.9;
  }

  // Word-based matching
  const contentWords = contentLower.split(/\s+/);
  let matchingWords = 0;
  let partialMatches = 0;

  for (const queryWord of queryWords) {
    // Exact word match
    if (contentWords.some(cw => cw === queryWord)) {
      matchingWords++;
    }
    // Partial word match
    else if (contentWords.some(cw => cw.includes(queryWord))) {
      partialMatches++;
    }
  }

  // Calculate score based on word matches
  const exactRatio = matchingWords / queryWords.length;
  const partialRatio = partialMatches / queryWords.length;
  const combinedScore = (exactRatio * 0.8) + (partialRatio * 0.4);

  return Math.min(combinedScore, 0.85); // Cap at 0.85 for word matches
}

/**
 * Calculate tag match boost
 * Returns bonus score if memory tags overlap with filter tags
 */
function calculateTagBoost(memoryTags: string[], filterTags?: string[]): number {
  if (!filterTags || filterTags.length === 0) return 0;

  const matchingTags = memoryTags.filter(tag =>
    filterTags.some(filterTag =>
      tag.toLowerCase() === filterTag.toLowerCase()
    )
  );

  // Boost increases with more matching tags (max 0.2)
  return Math.min(matchingTags.length * 0.1, 0.2);
}

/**
 * Calculate recency boost
 * More recent memories get a small bonus (max 0.1)
 */
function calculateRecencyBoost(createdAt: string): number {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const ageMs = now - created;

  // No boost for memories older than 30 days
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (ageMs > thirtyDaysMs) return 0;

  // Linear decay from 0.1 (today) to 0 (30 days ago)
  return 0.1 * (1 - (ageMs / thirtyDaysMs));
}

/**
 * Calculate final weighted score
 * Combines vector similarity, keyword match, tag boost, and recency boost
 */
function calculateFinalScore(
  vectorScore: number,
  keywordScore: number,
  tagBoost: number,
  recencyBoost: number
): number {
  // Weights (total = 1.0 before boosts)
  const VECTOR_WEIGHT = 0.6;    // Semantic meaning (most important)
  const KEYWORD_WEIGHT = 0.4;   // Exact word matches

  const baseScore = (vectorScore * VECTOR_WEIGHT) + (keywordScore * KEYWORD_WEIGHT);
  const finalScore = baseScore + tagBoost + recencyBoost;

  return Math.min(finalScore, 1.0); // Cap at 1.0
}

/**
 * Create user-specific enhanced memory search tool
 *
 * @param userId - Authenticated user's ID from Supabase
 * @returns Enhanced memory search tool bound to this user
 */
export function createUserMemorySearchEnhanced(userId: string) {
  return tool({
    name: 'memory_search_enhanced',
    description: `Search memories using hybrid vector + keyword search with advanced filtering.

Use this for:
- Semantic search: Find memories by meaning (e.g., "coffee preferences")
- Keyword search: Find exact phrases (e.g., "Python tutorial")
- Tag filtering: Filter by specific tags (e.g., ["work", "important"])
- Date filtering: Find memories created within a date range
- Combined queries: Use all filters together for precise results

The search combines vector similarity (semantic meaning) with keyword matching for the best results.`,

    parameters: z.object({
      query: z.string().min(1).describe('Search query - can be a question, keyword, or phrase'),
      top_k: z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
      tags: z.array(z.string()).optional().describe('Optional: Filter by specific tags (e.g., ["work", "project-x"])'),
      created_after: z.string().optional().describe('Optional: ISO date string - only return memories created after this date'),
      created_before: z.string().optional().describe('Optional: ISO date string - only return memories created before this date'),
      min_score: z.number().min(0).max(1).default(0.5).describe('Minimum relevance score (0-1). Higher = stricter matches'),
    }),

    async execute({ query, top_k, tags, created_after, created_before, min_score }) {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          throw new Error('Supabase configuration missing');
        }

        const openai = getOpenAI();
        if (!openai) {
          throw new Error('OpenAI configuration missing');
        }

        const limit = top_k ?? 10;
        const threshold = min_score ?? 0.5;
        const user_id = userId; // ✅ User-specific - no longer hardcoded!

      console.log('[memory_search_enhanced]', {
        query,
        limit,
        tags,
        created_after,
        created_before,
        min_score: threshold,
      });

      // Step 1: Generate embedding for vector search
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0]?.embedding;
      if (!queryEmbedding) {
        throw new Error('Failed to generate embedding for query');
      }

      // Step 2: Vector similarity search
      const rpcInput: Record<string, unknown> = {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Lower threshold - we'll filter by final score later
        match_count: limit * 3, // Get more candidates for hybrid scoring
      };

      if (user_id) {
        rpcInput['user_id'] = user_id;
      }

      const { data: vectorResults, error: vectorError } = await supabase.rpc(
        'match_memories',
        rpcInput
      );

      if (vectorError) {
        console.error('[vector search error]', vectorError);
        throw new Error(`Vector search failed: ${vectorError.message}`);
      }

      // Step 3: Keyword search
      let keywordQuery = supabase
        .from('memories')
        .select('id, content, tags, created_at')
        .eq('user_id', user_id)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get candidates

      // Apply tag filter
      if (tags && tags.length > 0) {
        keywordQuery = keywordQuery.overlaps('tags', tags);
      }

      // Apply date range filters
      if (created_after) {
        keywordQuery = keywordQuery.gte('created_at', created_after);
      }
      if (created_before) {
        keywordQuery = keywordQuery.lte('created_at', created_before);
      }

      const { data: keywordResults, error: keywordError } = await keywordQuery;

      if (keywordError) {
        console.error('[keyword search error]', keywordError);
        throw new Error(`Keyword search failed: ${keywordError.message}`);
      }

      // Step 4: Merge and score results
      const mergedMap = new Map<string, ScoredMemory>();

      // Process vector results
      for (const result of (vectorResults as MemorySearchResult[] || [])) {
        // Apply tag filter manually (vector search doesn't support it)
        if (tags && tags.length > 0) {
          const memoryTags = result.tags || [];
          const hasMatchingTag = tags.some((filterTag: string) =>
            memoryTags.some((memoryTag: string) =>
              memoryTag.toLowerCase() === filterTag.toLowerCase()
            )
          );
          if (!hasMatchingTag) continue;
        }

        // Apply date filters manually
        if (created_after && new Date(result.created_at) < new Date(created_after)) {
          continue;
        }
        if (created_before && new Date(result.created_at) > new Date(created_before)) {
          continue;
        }

        const vectorScore = result.similarity ?? result.score ?? 0;
        const keywordScore = calculateKeywordScore(result.content, query);
        const tagBoost = calculateTagBoost(result.tags || [], tags);
        const recencyBoost = calculateRecencyBoost(result.created_at);
        const finalScore = calculateFinalScore(vectorScore, keywordScore, tagBoost, recencyBoost);

        mergedMap.set(result.id, {
          id: result.id,
          content: result.content,
          tags: result.tags || [],
          created_at: result.created_at,
          vector_score: vectorScore,
          keyword_score: keywordScore,
          tag_boost: tagBoost,
          recency_boost: recencyBoost,
          final_score: finalScore,
        });
      }

      // Process keyword results (may have some not in vector results)
      for (const result of (keywordResults || [])) {
        if (!mergedMap.has(result.id)) {
          const vectorScore = 0.5; // Default vector score for keyword-only matches
          const keywordScore = calculateKeywordScore(result.content, query);
          const tagBoost = calculateTagBoost(result.tags || [], tags);
          const recencyBoost = calculateRecencyBoost(result.created_at);
          const finalScore = calculateFinalScore(vectorScore, keywordScore, tagBoost, recencyBoost);

          mergedMap.set(result.id, {
            id: result.id,
            content: result.content,
            tags: result.tags || [],
            created_at: result.created_at,
            vector_score: vectorScore,
            keyword_score: keywordScore,
            tag_boost: tagBoost,
            recency_boost: recencyBoost,
            final_score: finalScore,
          });
        } else {
          // Update keyword score if we found it in keyword search too
          const existing = mergedMap.get(result.id)!;
          const keywordScore = calculateKeywordScore(result.content, query);
          const finalScore = calculateFinalScore(
            existing.vector_score,
            keywordScore,
            existing.tag_boost,
            existing.recency_boost
          );
          existing.keyword_score = keywordScore;
          existing.final_score = finalScore;
        }
      }

      // Step 5: Sort by final score and apply threshold
      const scoredResults = Array.from(mergedMap.values())
        .filter(r => r.final_score >= threshold)
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, limit);

      console.log('[memory_search_enhanced] Results:', {
        vector_count: vectorResults?.length || 0,
        keyword_count: keywordResults?.length || 0,
        merged_count: mergedMap.size,
        final_count: scoredResults.length,
      });

      // Format results for agent
      const results = scoredResults.map(r => ({
        id: r.id,
        content: r.content,
        tags: r.tags,
        score: r.final_score,
        created_at: r.created_at,
        scoring_details: {
          vector_score: r.vector_score.toFixed(3),
          keyword_score: r.keyword_score.toFixed(3),
          tag_boost: r.tag_boost.toFixed(3),
          recency_boost: r.recency_boost.toFixed(3),
        },
      }));

      return JSON.stringify({
        ok: true,
        results,
        count: results.length,
        search_type: 'hybrid_vector_keyword',
        filters_applied: {
          tags: tags || [],
          created_after: created_after || null,
          created_before: created_before || null,
          min_score: threshold,
        },
      });

      } catch (error: unknown) {
        console.error('[memory_search_enhanced] Error:', error);

        return JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : 'Memory search failed',
          results: [],
          count: 0,
        });
      }
    },
  });
}

/**
 * Tool metadata for unified tool system
 */
export const memorySearchEnhancedMetadata = {
  name: 'memory_search_enhanced',
  displayName: 'Enhanced Memory Search',
  description: 'Hybrid vector + keyword search with tag and date filtering',
  category: 'memory' as const,
  cost: 0.0001, // Embedding cost
  riskLevel: 'low' as const,
  requiresApproval: false,
  dependencies: ['OPENAI_API_KEY', 'SUPABASE'],
  examples: [
    {
      userRequest: 'What did I say about my coffee preferences?',
      toolCall: {
        query: 'coffee preferences',
        top_k: 5,
        min_score: 0.6,
      },
    },
    {
      userRequest: 'Find work-related memories from last month',
      toolCall: {
        query: 'work project',
        tags: ['work'],
        created_after: '2025-10-01T00:00:00Z',
        top_k: 10,
      },
    },
  ],
};
