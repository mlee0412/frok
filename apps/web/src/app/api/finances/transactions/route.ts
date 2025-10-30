import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateQuery } from '@/lib/api/withValidation';
import { formatErrorMessage } from '@/lib/errorHandler';
import { transactionListQuerySchema } from '@/schemas';
import type { Transaction, Account, Category } from '@/types/finances';

type TransactionRow = Pick<Transaction, 'id' | 'account_id' | 'category_id' | 'amount' | 'currency' | 'description'> & {
  posted_at: string;
};

type AccountInfo = Pick<Account, 'id' | 'name' | 'currency'>;
type CategoryInfo = Pick<Category, 'id' | 'name'>;

type TransactionListItem = {
  id: string;
  posted_at: string;
  amount: number;
  currency: string;
  description: string;
  account: string;
  category: string;
};

export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Validate query parameters
  const validation = await validateQuery(req, transactionListQuerySchema);
  if (!validation.ok) return validation.response;

  try {
    const supabase = getSupabaseServer();
    const { q, from, to, category, account, limit, offset } = validation.data;

    // Build query with user isolation
    let qb = supabase
      .from('fin_transactions')
      .select('id, posted_at, amount, currency, description, account_id, category_id', { count: 'exact' })
      .eq('user_id', auth.user.userId)
      .order('posted_at', { ascending: false });

    // Apply filters
    if (q) qb = qb.ilike('description', `%${q}%`);
    if (from) qb = qb.gte('posted_at', from);
    if (to) qb = qb.lte('posted_at', to);
    if (category) qb = qb.eq('category_id', category);
    if (account) qb = qb.eq('account_id', account);

    const { data: tx, error, count } = await qb.range(offset, offset + limit - 1);
    if (error) throw error;

    // Extract unique account and category IDs
    const accountIds = Array.from(
      new Set(
        (tx as TransactionRow[] || [])
          .map((t) => t.account_id)
          .filter(Boolean)
      )
    );
    const categoryIds = Array.from(
      new Set(
        (tx as TransactionRow[] || [])
          .map((t) => t.category_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    // Fetch account and category details
    const [acctRes, catRes] = await Promise.all([
      accountIds.length > 0
        ? supabase
            .from('fin_accounts')
            .select('id, name, currency')
            .eq('user_id', auth.user.userId)
            .in('id', accountIds)
        : Promise.resolve({ data: [] as AccountInfo[], error: null }),
      categoryIds.length > 0
        ? supabase
            .from('fin_categories')
            .select('id, name')
            .eq('user_id', auth.user.userId)
            .in('id', categoryIds)
        : Promise.resolve({ data: [] as CategoryInfo[], error: null }),
    ]);

    if (acctRes.error) throw acctRes.error;
    if (catRes.error) throw catRes.error;

    // Build lookup maps
    const acctMap = new Map<string, AccountInfo>();
    for (const a of (acctRes.data as AccountInfo[]) || []) {
      acctMap.set(a.id, a);
    }

    const catMap = new Map<string, CategoryInfo>();
    for (const c of (catRes.data as CategoryInfo[]) || []) {
      catMap.set(c.id, c);
    }

    // Format response items
    const items: TransactionListItem[] = (tx as TransactionRow[] || []).map((t) => ({
      id: t.id,
      posted_at: t.posted_at,
      amount: typeof t.amount === 'number' ? t.amount : Number(t.amount || 0),
      currency: t.currency || acctMap.get(t.account_id)?.currency || 'USD',
      description: t.description || '',
      account: acctMap.get(t.account_id)?.name || '',
      category: catMap.get(t.category_id || '')?.name || '',
    }));

    return NextResponse.json({
      ok: true,
      items,
      total: typeof count === 'number' ? count : null,
      limit,
      offset,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: formatErrorMessage(error),
        items: [],
      },
      { status: 500 }
    );
  }
}
