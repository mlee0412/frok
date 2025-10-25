import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'missing_supabase_env' }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const content = String(body?.content || '').trim();
  if (!content) {
    return NextResponse.json({ ok: false, error: 'content_required' }, { status: 400 });
  }

  const tags = Array.isArray(body?.tags) ? body.tags.map((t: any) => String(t)).filter(Boolean) : [];
  // For now, use a default user_id. In production, use authenticated user.
  const user_id = 'system';

  try {
    const { data, error } = await supabase
      .from('memories')
      .insert({ user_id, content, tags })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'exception', detail: e?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST { content, tags? } to store a memory' }, { status: 200 });
}
