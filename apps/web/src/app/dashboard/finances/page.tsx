import React from 'react';
import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import { Card } from '@frok/ui';

// Dynamic imports for heavy finance components
const FinancesCharts = dynamic(() => import('./FinancesCharts'), {
  loading: () => <div className="h-32 animate-pulse bg-surface/50 rounded" />,
});

const FinancesImportClient = dynamic(() => import('./FinancesImportClient'), {
  loading: () => <div className="h-40 animate-pulse bg-surface/50 rounded" />,
});

const FinancesRulesClient = dynamic(() => import('./FinancesRulesClient'), {
  loading: () => <div className="h-40 animate-pulse bg-surface/50 rounded" />,
});

const FinancesTransactionsClient = dynamic(() => import('./FinancesTransactionsClient'), {
  loading: () => <div className="h-96 animate-pulse bg-surface/50 rounded" />,
});

// ISR with 60-second revalidation for financial data
export const revalidate = 60;

export default async function DashboardFinancesPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const f = (p: string) => fetch(`${base}${p}`, { next: { revalidate: 60 } }).then(r => r.json()).catch(() => null);

  const [summary, transactions] = await Promise.all([
    f('/api/finances/summary'),
    f('/api/finances/transactions'),
  ]);

  const total = typeof summary?.totalBalance === 'number' ? summary.totalBalance : 0;
  const month = typeof summary?.monthSpending === 'number' ? summary.monthSpending : 0;
  const items: Array<any> = Array.isArray(transactions?.items) ? transactions.items : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Finances</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-foreground/60">Total Balance</div>
          <div className="text-2xl font-semibold">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-foreground/60">This Month Spend</div>
          <div className="text-2xl font-semibold">${month.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-foreground/60">Charts</div>
          <FinancesCharts items={items.map((t) => ({ posted_at: t.posted_at, amount: t.amount, category: t.category }))} />
        </Card>
      </div>

      <FinancesImportClient />

      <FinancesRulesClient />

      <FinancesTransactionsClient />
    </div>
  );
}
