import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const body = await req.json();
    const { expiresInDays } = body;
    const { threadId } = await context.params;

    const supabase = await getSupabaseServer();
    
    // Generate unique share token
    const shareToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from('shared_threads')
      .insert({
        thread_id: threadId,
        share_token: shareToken,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;

    const shareUrl = `${req.headers.get('origin')}/shared/${shareToken}`;

    return NextResponse.json({ ok: true, shareUrl, token: shareToken });
  } catch (e: any) {
    console.error('[share POST error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await context.params;
    const supabase = await getSupabaseServer();
    
    const { error } = await supabase
      .from('shared_threads')
      .delete()
      .eq('thread_id', threadId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[share DELETE error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to delete share link' },
      { status: 500 }
    );
  }
}
