import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

// GET - Retrieve agent memories
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentName = searchParams.get('agent_name') || 'FROK Assistant';
    const memoryType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = getSupabaseServer();
    
    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_name', agentName)
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ ok: true, memories: data || [] });
  } catch (e: any) {
    console.error('[memory GET error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to retrieve memories' },
      { status: 500 }
    );
  }
}

// POST - Add new agent memory
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agent_name, memory_type, content, importance, metadata } = body;

    if (!content || !memory_type) {
      return NextResponse.json(
        { ok: false, error: 'content and memory_type required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        agent_name: agent_name || 'FROK Assistant',
        memory_type,
        content,
        importance: importance || 5,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, memory: data });
  } catch (e: any) {
    console.error('[memory POST error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to add memory' },
      { status: 500 }
    );
  }
}

// DELETE - Remove agent memory
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('id');

    if (!memoryId) {
      return NextResponse.json(
        { ok: false, error: 'memory id required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    
    const { error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('id', memoryId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[memory DELETE error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
