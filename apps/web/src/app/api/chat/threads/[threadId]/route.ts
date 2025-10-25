import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function PATCH(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const body = await req.json();
    const { title, pinned, archived, tags, folder, enabled_tools, model, agent_style } = body;

    const supabase = getSupabaseServer();
    
    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (pinned !== undefined) updates.pinned = pinned;
    if (archived !== undefined) updates.archived = archived;
    if (tags !== undefined) updates.tags = tags;
    if (folder !== undefined) updates.folder = folder;
    if (enabled_tools !== undefined) updates.enabled_tools = enabled_tools;
    if (model !== undefined) updates.model = model;
    if (agent_style !== undefined) updates.agent_style = agent_style;

    const { data, error } = await supabase
      .from('chat_threads')
      .update(updates)
      .eq('id', params.threadId)
      .eq('user_id', DEMO_USER_ID)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, thread: data });
  } catch (e: any) {
    console.error('[thread PATCH error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to update thread' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = getSupabaseServer();
    
    const { error } = await supabase
      .from('chat_threads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.threadId)
      .eq('user_id', DEMO_USER_ID);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[thread DELETE error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to delete thread' },
      { status: 500 }
    );
  }
}
