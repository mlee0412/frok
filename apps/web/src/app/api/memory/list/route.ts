import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

// GET - List all memories for the user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const tag = searchParams.get('tag');
    
    const supabase = getSupabaseServer();
    
    // TODO: Get from authenticated session
    // For now, using default user_id
    const user_id = 'system';
    
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
    
  } catch (e: any) {
    console.error('[memory list exception]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to list memories' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a memory
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Memory ID required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseServer();
    
    // TODO: Get from authenticated session
    const user_id = 'system';
    
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
    
  } catch (e: any) {
    console.error('[memory delete exception]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
