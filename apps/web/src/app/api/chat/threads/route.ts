import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateBody } from '@/lib/api/withValidation';
import { formatErrorMessage } from '@/lib/errorHandler';
import { createThreadSchema } from '@/schemas';

export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await auth.user.supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', auth.user.userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, threads: data });
  } catch (error: unknown) {
    console.error('[threads GET error]', error);
    return NextResponse.json(
      { ok: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Validate request body
  const validation = await validateBody(req, createThreadSchema);
  if (!validation.ok) return validation.response;

  try {
    const { title, agentId } = validation.data;

    const threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const { data, error } = await auth.user.supabase
      .from('chat_threads')
      .insert({
        id: threadId,
        user_id: auth.user.userId,
        title: title || 'New Chat',
        agent_id: agentId,
        tools_enabled: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, thread: data });
  } catch (error: unknown) {
    console.error('[threads POST error]', error);
    return NextResponse.json(
      { ok: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
