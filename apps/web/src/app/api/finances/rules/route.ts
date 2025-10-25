import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

export async function GET() {
  try {
    const supabase = supabaseServiceClient();
    const { data, error } = await supabase.from('fin_rules').select('id, pattern, category_id').order('pattern', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg, items: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServiceClient();
    const body = await req.json();
    const pattern = String((body?.pattern || '')).trim();
    const category_id = String((body?.category_id || '')).trim();
    if (!pattern) return NextResponse.json({ ok: false, error: 'pattern_required' }, { status: 400 });
    if (!category_id) return NextResponse.json({ ok: false, error: 'category_id_required' }, { status: 400 });
    // verify category exists
    const { data: cat, error: catErr } = await supabase.from('fin_categories').select('id').eq('id', category_id).maybeSingle();
    if (catErr) throw catErr;
    if (!cat) return NextResponse.json({ ok: false, error: 'category_not_found' }, { status: 404 });
    const { data, error } = await supabase.from('fin_rules').insert({ pattern, category_id }).select('id, pattern, category_id').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = supabaseServiceClient();
    const body = await req.json().catch(() => ({}));
    const id = String((body?.id || '')).trim();
    if (!id) return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });
    const { error } = await supabase.from('fin_rules').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
