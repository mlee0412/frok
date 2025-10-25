import { NextResponse } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

export async function GET() {
  try {
    const supabase = supabaseServiceClient();
    const { data, error } = await supabase
      .from('fin_accounts')
      .select('id, name, currency')
      .order('name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg, items: [] }, { status: 500 });
  }
}
