import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const supabase = getSupabaseServer();
    
    // Get shared thread info
    const { data: sharedThread, error: shareError } = await supabase
      .from('shared_threads')
      .select('*')
      .eq('share_token', token)
      .single();

    if (shareError || !sharedThread) {
      return NextResponse.json(
        { ok: false, error: 'Shared conversation not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (sharedThread.expires_at && new Date(sharedThread.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, error: 'This shared conversation has expired' },
        { status: 410 }
      );
    }

    // Get thread details
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('id', sharedThread.thread_id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { ok: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Increment view count
    await supabase
      .from('shared_threads')
      .update({ view_count: sharedThread.view_count + 1 })
      .eq('id', sharedThread.id);

    return NextResponse.json({
      ok: true,
      thread: {
        title: thread.title,
        messages: messages || [],
        created_at: thread.created_at,
      },
    });
  } catch (e: any) {
    console.error('[shared GET error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to load shared conversation' },
      { status: 500 }
    );
  }
}
