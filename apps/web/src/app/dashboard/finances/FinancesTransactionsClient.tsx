'use client';
import * as React from 'react';
import { Card, Button, Input, useToast } from '@frok/ui';

 type Tx = {
  id: string;
  posted_at: string;
  amount: number;
  currency: string;
  description: string;
  account: string;
  category: string;
};

 type Option = { id: string; name: string };

export default function FinancesTransactionsClient() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState<null | string>(null);

  const [accounts, setAccounts] = React.useState<Option[]>([]);
  const [categories, setCategories] = React.useState<Option[]>([]);

  const [q, setQ] = React.useState('');
  const [account, setAccount] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [limit, setLimit] = React.useState(25);
  const [offset, setOffset] = React.useState(0);

  const [items, setItems] = React.useState<Tx[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);

  const debTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadOptions() {
    try {
      const [acct, cat] = await Promise.all([
        fetch('/api/finances/accounts', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch('/api/finances/categories', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      ]);
      if (acct?.ok && Array.isArray(acct.items)) setAccounts(acct.items);
      if (cat?.ok && Array.isArray(cat.items)) setCategories(cat.items);
    } catch {}
  }

  async function load() {
    setLoading(true);
    try {
      const usp = new URLSearchParams();
      if (q.trim()) usp.set('q', q.trim());
      if (account) usp.set('account', account);
      if (category) usp.set('category', category);
      if (from) usp.set('from', from);
      if (to) usp.set('to', to);
      usp.set('limit', String(limit));
      usp.set('offset', String(offset));
      const r = await fetch(`/api/finances/transactions?${usp.toString()}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        setItems(Array.isArray(j.items) ? j.items : []);
        setTotal(typeof j.total === 'number' ? j.total : null);
      } else {
        setItems([]);
        setTotal(null);
        toast.error('Failed to load transactions');
      }
    } catch {
      setItems([]);
      setTotal(null);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadOptions(); }, []);

  React.useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      setOffset(0); // reset page on filter changes
      load();
    }, 300);
    return () => { if (debTimer.current) clearTimeout(debTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, account, category, from, to, limit]);

  React.useEffect(() => { load(); }, [offset]);

  const fromIdx = total != null ? Math.min(total, offset + 1) : offset + 1;
  const toIdx = total != null ? Math.min(total, offset + items.length) : offset + items.length;

  const canPrev = offset > 0;
  const canNext = total != null ? (offset + items.length) < total : items.length === limit; // if total unknown, allow next if page is full

  function prevPage() { if (canPrev) setOffset(Math.max(0, offset - limit)); }
  function nextPage() { if (canNext) setOffset(offset + limit); }

  return (
    <Card className="p-4">
      <div className="font-medium mb-3">Transactions</div>

      <div className="flex flex-wrap gap-2 items-center mb-3">
        <Input placeholder="Search description" value={q} onChange={(e: any) => setQ(e.currentTarget.value)} />
        <select className="border rounded px-2 py-1 text-sm bg-transparent" value={account} onChange={(e) => setAccount(e.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1 text-sm bg-transparent" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input type="date" value={from} onChange={(e: any) => setFrom(e.currentTarget.value)} />
        <Input type="date" value={to} onChange={(e: any) => setTo(e.currentTarget.value)} />
        <select className="border rounded px-2 py-1 text-sm bg-transparent" value={String(limit)} onChange={(e) => setLimit(parseInt(e.target.value, 10) || 25)}>
          {['10','25','50','100','200'].map(n => <option key={n} value={n}>{n}/page</option>)}
        </select>
        <Button size="sm" disabled={pending!==null} onClick={() => { setPending('reset'); setQ(''); setAccount(''); setCategory(''); setFrom(''); setTo(''); setOffset(0); setPending(null); }}>
          Reset
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-foreground/60 mb-2">
        <div>{loading ? 'Loading…' : `${items.length} items`}{total != null ? ` • ${fromIdx}-${toIdx} of ${total}` : ''}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={!canPrev || loading} onClick={prevPage}>Prev</Button>
          <Button size="sm" variant="outline" disabled={!canNext || loading} onClick={nextPage}>Next</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-foreground/60">
            <tr>
              <th className="text-left py-2 pr-3">Date</th>
              <th className="text-left py-2 pr-3">Account</th>
              <th className="text-left py-2 pr-3">Description</th>
              <th className="text-right py-2 pl-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="py-2 pr-3">{new Date(t.posted_at).toLocaleDateString()}</td>
                <td className="py-2 pr-3">{t.account || ''}</td>
                <td className="py-2 pr-3">{t.description || ''}</td>
                <td className={["py-2 pl-3 text-right",(typeof t.amount === 'number' && t.amount < 0) ? 'text-danger' : 'text-success'].join(' ')}>
                  {typeof t.amount === 'number' ? t.amount.toLocaleString(undefined, { style: 'currency', currency: t.currency || 'USD' }) : ''}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="py-6 text-center text-foreground/60" colSpan={4}>No transactions.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
