import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { z } from 'zod';

// Validation schema for search body
const searchMemoryBodySchema = z.object({
  query: z.string().min(1, 'Query is required').max(500),
  top_k: z.number().min(1).max(50).default(10),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    // Validate request body
    const validation = searchMemoryBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { query, top_k, tags } = validation.data;
    const supabase = auth.user.supabase;
    const user_id = auth.user.userId;

    // Build query with user isolation
    let dbQuery = supabase
      .from('memories')
      .select('id, content, tags, created_at')
      .eq('user_id', user_id)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(top_k);

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      dbQuery = dbQuery.overlaps('tags', tags);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('[memory search error]', error);
      return NextResponse.json(
        { ok: false, error: 'Database search failed', details: error.message },
        { status: 500 }
      );
    }

    // Return results with a basic score (1.0 for matches)
    const results = (data || []).map((m) => ({
      id: m.id,
      content: m.content,
      tags: m.tags || [],
      score: 1.0,
      created_at: m.created_at,
    }));

    return NextResponse.json({ ok: true, results }, { status: 200 });

  } catch (error: unknown) {
    console.error('[memory search exception]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to search memories' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST { query, top_k? } to search memories' }, { status: 200 });
}
