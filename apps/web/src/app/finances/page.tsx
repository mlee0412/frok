import React from 'react';
import { Card } from '@/components/ui/card';

export default function FinancesPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Finances</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="font-medium">Overview</div>
          <div className="text-sm text-gray-500">Revenue, expenses, and cash flow (coming soon)</div>
        </Card>
        <Card>
          <div className="font-medium">Recent Activity</div>
          <div className="text-sm text-gray-500">Transactions, payouts, settlements (coming soon)</div>
        </Card>
      </div>
    </div>
  );
}
