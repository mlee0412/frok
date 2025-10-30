import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateBody } from '@/lib/api/withValidation';
import { formatErrorMessage } from '@/lib/errorHandler';
import { addMemorySchema } from '@/schemas';

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Validate request body
  const validation = await validateBody(req, addMemorySchema);
  if (!validation.ok) return validation.response;

  try {
    const { content, category, tags, metadata, importance } = validation.data;

    const supabase = await getSupabaseServer();

    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: auth.user.userId,
        content,
        category,
        tags,
        metadata,
        importance,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error: unknown) {
    console.error('[memory POST error]', error);
    return NextResponse.json(
      { ok: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST { content, tags? } to store a memory' }, { status: 200 });
}
