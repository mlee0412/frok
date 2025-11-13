import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateBody, validateQuery } from '@/lib/api/withValidation';
import { formatErrorMessage } from '@/lib/errorHandler';
import { createMessageSchema, messageListQuerySchema } from '@/schemas';

export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Validate query parameters
  const validation = await validateQuery(req, messageListQuerySchema);
  if (!validation.ok) return validation.response;

  try {
    const { thread_id, limit = 50, offset = 0, since } = validation.data;

    let query = auth.user.supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', thread_id)
      .eq('user_id', auth.user.userId)
      .order('created_at', { ascending: true });

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data });
  } catch (error: unknown) {
    console.error('[messages GET error]', error);
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
  const validation = await validateBody(req, createMessageSchema);
  if (!validation.ok) return validation.response;

  try {
    const { thread_id, role, content, source, file_urls } = validation.data;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const { data, error} = await auth.user.supabase
      .from('chat_messages')
      .insert({
        id: messageId,
        user_id: auth.user.userId,
        thread_id,
        role,
        content,
        source,
        file_urls: file_urls || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, message: data });
  } catch (error: unknown) {
    console.error('[messages POST error]', error);
    return NextResponse.json(
      { ok: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
