import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

export async function GET() {
  try {
    const supabase = supabaseServiceClient();
    const { data, error } = await supabase.from('fin_categories').select('id, name').order('name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg, items: [] }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = supabaseServiceClient();
    const body = await req.json().catch(() => ({}));
    const id = String((body?.id || '')).trim();
    if (!id) return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });
    const { error } = await supabase.from('fin_categories').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServiceClient();
    const body = await req.json();
    const name = String((body?.name || '')).trim();
    if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
    const { data, error } = await supabase.from('fin_categories').insert({ name }).select('id, name').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
