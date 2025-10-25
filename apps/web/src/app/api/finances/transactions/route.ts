import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServiceClient();
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim();
    const from = (sp.get('from') || '').trim();
    const to = (sp.get('to') || '').trim();
    const category = (sp.get('category') || '').trim();
    const account = (sp.get('account') || '').trim();
    const limitRaw = parseInt(sp.get('limit') || '50', 10);
    const offsetRaw = parseInt(sp.get('offset') || '0', 10);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));
    const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0);

    let qb = supabase
      .from('fin_transactions')
      .select('id, posted_at, amount, currency, description, account_id, category_id', { count: 'exact' })
      .order('posted_at', { ascending: false });

    if (q) qb = qb.ilike('description', `%${q}%`);
    if (from) qb = qb.gte('posted_at', from);
    if (to) qb = qb.lte('posted_at', to);
    if (category) qb = qb.eq('category_id', category);
    if (account) qb = qb.eq('account_id', account);

    const { data: tx, error, count } = await qb.range(offset, offset + limit - 1);
    if (error) throw error;

    const accountIds = Array.from(new Set((tx || []).map((t: any) => t.account_id).filter(Boolean)));
    const categoryIds = Array.from(new Set((tx || []).map((t: any) => t.category_id).filter(Boolean)));

    const [acctRes, catRes] = await Promise.all([
      accountIds.length > 0
        ? supabase.from('fin_accounts').select('id, name, currency').in('id', accountIds)
        : Promise.resolve({ data: [], error: null } as any),
      categoryIds.length > 0
        ? supabase.from('fin_categories').select('id, name').in('id', categoryIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (acctRes.error) throw acctRes.error;
    if (catRes.error) throw catRes.error;

    const acctMap = new Map<string, { id: string; name: string; currency?: string }>();
    for (const a of (acctRes.data as any[]) || []) acctMap.set(a.id, a);
    const catMap = new Map<string, { id: string; name: string }>();
    for (const c of (catRes.data as any[]) || []) catMap.set(c.id, c);

    const items = (tx || []).map((t: any) => ({
      id: t.id,
      posted_at: t.posted_at,
      amount: typeof t.amount === 'number' ? t.amount : Number(t.amount),
      currency: t.currency || acctMap.get(t.account_id)?.currency || 'USD',
      description: t.description || '',
      account: acctMap.get(t.account_id)?.name || '',
      category: catMap.get(t.category_id || '')?.name || '',
    }));

    return NextResponse.json({ ok: true, items, total: typeof count === 'number' ? count : null, limit, offset });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg, items: [] }, { status: 500 });
  }
}
