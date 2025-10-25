import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('thread_id');

    if (!threadId) {
      return NextResponse.json(
        { ok: false, error: 'thread_id required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .eq('user_id', DEMO_USER_ID)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data });
  } catch (e: any) {
    console.error('[messages GET error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { thread_id, role, content } = body;

    if (!thread_id || !role || content === undefined) {
      return NextResponse.json(
        { ok: false, error: 'thread_id, role, and content required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        id: messageId,
        user_id: DEMO_USER_ID,
        thread_id,
        role,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    // Note: thread updated_at is automatically updated via database trigger

    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) {
    console.error('[messages POST error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to create message' },
      { status: 500 }
    );
  }
}
