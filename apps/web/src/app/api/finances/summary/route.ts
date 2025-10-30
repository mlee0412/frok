import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api/withAuth';
import { formatErrorMessage } from '@/lib/errorHandler';
import type { Category } from '@/types/finances';

type CategoryInfo = Pick<Category, 'id' | 'name'>;

export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = await getSupabaseServer();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartIso = monthStart.toISOString();

    const [{ data: allTx, error: allErr }, { data: monthTx, error: monthErr }] = await Promise.all([
      supabase
        .from('fin_transactions')
        .select('amount')
        .eq('user_id', auth.user.userId)
        .limit(100000),
      supabase
        .from('fin_transactions')
        .select('amount, category_id')
        .eq('user_id', auth.user.userId)
        .gte('posted_at', monthStartIso)
        .limit(100000),
    ]);

    if (allErr) throw allErr;
    if (monthErr) throw monthErr;

    // Calculate total balance with proper type safety
    const totalBalance = (allTx || []).reduce((sum, t) => {
      const amount = typeof t.amount === 'number' ? t.amount : Number(t.amount || 0);
      return sum + amount;
    }, 0);

    // Calculate monthly spending (negative amounts only)
    const monthSpendingRaw = (monthTx || [])
      .filter((t) => {
        const amount = typeof t.amount === 'number' ? t.amount : Number(t.amount || 0);
        return amount < 0;
      })
      .reduce((sum, t) => {
        const amount = typeof t.amount === 'number' ? t.amount : Number(t.amount || 0);
        return sum + Math.abs(amount);
      }, 0);

    // Group by category
    const catTotals = new Map<string, number>();
    for (const t of monthTx || []) {
      const amt = typeof t.amount === 'number' ? t.amount : Number(t.amount || 0);
      if (amt >= 0) continue; // spending only
      if (!t.category_id) continue;
      catTotals.set(t.category_id, (catTotals.get(t.category_id) || 0) + Math.abs(amt));
    }

    let byCategory: Array<{ category: string; amount: number }> = [];
    const catIds = Array.from(catTotals.keys());

    if (catIds.length > 0) {
      const { data: cats, error: catErr } = await supabase
        .from('fin_categories')
        .select('id, name')
        .eq('user_id', auth.user.userId)
        .in('id', catIds);

      if (catErr) throw catErr;

      const nameMap = new Map<string, string>();
      for (const c of (cats as CategoryInfo[]) || []) {
        nameMap.set(c.id, c.name);
      }

      byCategory = catIds.map((id) => ({
        category: nameMap.get(id) || 'Uncategorized',
        amount: Number(catTotals.get(id) || 0),
      }));

      byCategory.sort((a, b) => b.amount - a.amount);
    }

    return NextResponse.json({
      ok: true,
      totalBalance: Number(totalBalance),
      monthSpending: Number(monthSpendingRaw),
      byCategory,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: formatErrorMessage(error),
        totalBalance: 0,
        monthSpending: 0,
        byCategory: [],
      },
      { status: 500 }
    );
  }
}
