import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateQuery } from '@/lib/api/withValidation';
import { listAgentMemoriesSchema, addAgentMemorySchema, deleteAgentMemorySchema } from '@/schemas';

// GET - Retrieve agent memories
export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const validation = validateQuery(listAgentMemoriesSchema, req);
    if (!validation.ok) return validation.response;

    const { agent_name, type, limit } = validation.data;
    const supabase = auth.user.supabase;
    const user_id = auth.user.userId;

    // Query agent memories with user isolation
    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('user_id', user_id)  // ← User isolation
      .eq('agent_name', agent_name)
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('memory_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[agent memory GET error]', error);
      throw error;
    }

    return NextResponse.json({ ok: true, memories: data || [] });
  } catch (error: unknown) {
    console.error('[agent memory GET exception]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to retrieve memories' },
      { status: 500 }
    );
  }
}

// POST - Add new agent memory
export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    // Validate request body
    const body = await req.json();
    const parsed = addAgentMemorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { agent_name, memory_type, content, importance, metadata } = parsed.data;
    const supabase = auth.user.supabase;
    const user_id = auth.user.userId;

    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        user_id,  // ← User isolation
        agent_name,
        memory_type,
        content,
        importance,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('[agent memory POST error]', error);
      throw error;
    }

    return NextResponse.json({ ok: true, memory: data });
  } catch (error: unknown) {
    console.error('[agent memory POST exception]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to add memory' },
      { status: 500 }
    );
  }
}

// DELETE - Remove agent memory
export async function DELETE(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const parsed = deleteAgentMemorySchema.safeParse({
      id: searchParams.get('id'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid memory ID', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { id } = parsed.data;
    const supabase = auth.user.supabase;
    const user_id = auth.user.userId;

    // Security: Only delete user's own memories
    const { error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);  // ← User isolation

    if (error) {
      console.error('[agent memory DELETE error]', error);
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[agent memory DELETE exception]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
