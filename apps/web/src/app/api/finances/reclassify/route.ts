import { NextResponse } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = supabaseServiceClient();
    const { data: rules, error: rulesErr } = await supabase.from('fin_rules').select('id, pattern, category_id');
    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    let totalUpdated = 0;
    for (const r of rules) {
      const pattern = String(r.pattern || '').trim();
      const category_id = r.category_id as string | null;
      if (!pattern || !category_id) continue;
      // Update any transactions whose description matches pattern
      const { data: updated, error: updErr } = await supabase
        .from('fin_transactions')
        .update({ category_id })
        .ilike('description', `%${pattern}%`)
        .select('id');
      if (updErr) throw updErr;
      totalUpdated += Array.isArray(updated) ? updated.length : 0;
    }

    return NextResponse.json({ ok: true, updated: totalUpdated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
