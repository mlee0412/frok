import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

// Temporary user ID for demo (replace with auth later)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, threads: data });
  } catch (e: any) {
    console.error('[threads GET error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to fetch threads' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title = 'New Chat', agent_id = 'default' } = body;

    const supabase = getSupabaseServer();
    
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({
        id: threadId,
        user_id: DEMO_USER_ID,
        title,
        agent_id,
        tools_enabled: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, thread: data });
  } catch (e: any) {
    console.error('[threads POST error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to create thread' },
      { status: 500 }
    );
  }
}
