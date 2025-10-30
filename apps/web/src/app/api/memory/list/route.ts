import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { z } from 'zod';

// Validation schema for query params
const memoryListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  tag: z.string().optional(),
});

// GET - List all memories for the user
export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);

    // Validate query params
    const validation = memoryListQuerySchema.safeParse({
      limit: searchParams.get('limit') || '50',
      tag: searchParams.get('tag') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { limit, tag } = validation.data;
    const supabase = auth.user.supabase;
    const user_id = auth.user.userId;
    
    let query = supabase
      .from('memories')
      .select('id, content, tags, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Filter by tag if provided
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[memory list error]', error);
      throw error;
    }
    
    return NextResponse.json({
      ok: true,
      memories: data || []
    });

  } catch (error: unknown) {
    console.error('[memory list exception]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to list memories' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a memory
export async function DELETE(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Memory ID required' },
        { status: 400 }
      );
    }

    const supabase = auth.user.supabase;
    const user_id = auth.user.userId;
    
    // Security: Only delete user's own memories
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    
    if (error) {
      console.error('[memory delete error]', error);
      throw error;
    }

    return NextResponse.json({ ok: true });

  } catch (error: unknown) {
    console.error('[memory delete exception]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
