import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
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

  const query = String(body?.query || '').trim().toLowerCase();
  const top_k = typeof body?.top_k === 'number' && body.top_k > 0 ? Math.min(body.top_k, 50) : 10;

  if (!query) {
    return NextResponse.json({ ok: false, error: 'query_required' }, { status: 400 });
  }

  // For now, use a default user_id. In production, filter by authenticated user.
  const user_id = 'system';

  try {
    // Simple text search using ilike
    const { data, error } = await supabase
      .from('memories')
      .select('id, content, tags, created_at')
      .eq('user_id', user_id)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(top_k);

    if (error) {
      return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 });
    }

    // Return results with a basic score (1.0 for matches)
    const results = (data || []).map((m: any) => ({
      id: m.id,
      content: m.content,
      tags: m.tags || [],
      score: 1.0,
      created_at: m.created_at,
    }));

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'exception', detail: e?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST { query, top_k? } to search memories' }, { status: 200 });
}
