import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateBody, validateParams } from '@/lib/api/withValidation';
import { formatErrorMessage } from '@/lib/errorHandler';
import { updateThreadSchema, threadIdParamSchema } from '@/schemas';

type ThreadUpdates = {
  updated_at: string;
  title?: string;
  pinned?: boolean;
  archived?: boolean;
  tags?: string[];
  folder?: string;
  enabled_tools?: string[];
  model?: string;
  agent_style?: string;
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Validate params
  const paramsValidation = await validateParams(
    { params: await context.params },
    threadIdParamSchema
  );
  if (!paramsValidation.ok) return paramsValidation.response;
  const { threadId } = paramsValidation.data;

  // Validate request body
  const bodyValidation = await validateBody(req, updateThreadSchema);
  if (!bodyValidation.ok) return bodyValidation.response;

  try {
    const { title, pinned, archived, tags, folder, enabled_tools, model, agent_style } = bodyValidation.data;

    const supabase = getSupabaseServer();

    const updates: ThreadUpdates = { updated_at: new Date().toISOString() };
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
      .eq('id', threadId)
      .eq('user_id', auth.user.userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, thread: data });
  } catch (error: unknown) {
    console.error('[thread PATCH error]', error);
    return NextResponse.json(
      { ok: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Validate params
  const paramsValidation = await validateParams(
    { params: await context.params },
    threadIdParamSchema
  );
  if (!paramsValidation.ok) return paramsValidation.response;
  const { threadId } = paramsValidation.data;

  try {
    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from('chat_threads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', threadId)
      .eq('user_id', auth.user.userId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[thread DELETE error]', error);
    return NextResponse.json(
      { ok: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
