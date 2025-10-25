import { NextResponse } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

export async function GET() {
  try {
    const supabase = supabaseServiceClient();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartIso = monthStart.toISOString();

    const [{ data: allTx, error: allErr }, { data: monthTx, error: monthErr }] = await Promise.all([
      supabase
        .from('fin_transactions')
        .select('amount')
        .limit(100000),
      supabase
        .from('fin_transactions')
        .select('amount, category_id')
        .gte('posted_at', monthStartIso)
        .limit(100000),
    ]);
    if (allErr) throw allErr;
    if (monthErr) throw monthErr;

    const totalBalance = ((allTx as any[]) || []).reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : Number(t.amount)), 0);

    const monthSpendingRaw = ((monthTx as any[]) || [])
      .filter((t) => (typeof t.amount === 'number' ? t.amount : Number(t.amount)) < 0)
      .reduce((sum, t) => sum + Math.abs(typeof t.amount === 'number' ? t.amount : Number(t.amount)), 0);

    const catTotals = new Map<string, number>();
    for (const t of (monthTx as any[]) || []) {
      const amt = typeof t.amount === 'number' ? t.amount : Number(t.amount);
      if (amt >= 0) continue; // spending only
      if (!t.category_id) continue;
      catTotals.set(t.category_id, (catTotals.get(t.category_id) || 0) + Math.abs(amt));
    }

    let byCategory: Array<{ category: string; amount: number }> = [];
    const catIds = Array.from(catTotals.keys());
    if (catIds.length > 0) {
      const { data: cats, error: catErr } = await supabase.from('fin_categories').select('id, name').in('id', catIds);
      if (catErr) throw catErr;
      const nameMap = new Map<string, string>();
      for (const c of (cats as any[]) || []) nameMap.set(c.id, c.name);
      byCategory = catIds.map((id) => ({ category: nameMap.get(id) || 'Uncategorized', amount: Number(catTotals.get(id) || 0) }));
      byCategory.sort((a, b) => b.amount - a.amount);
    }

    return NextResponse.json({ ok: true, totalBalance: Number(totalBalance), monthSpending: Number(monthSpendingRaw), byCategory });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg, totalBalance: 0, monthSpending: 0, byCategory: [] }, { status: 500 });
  }
}
