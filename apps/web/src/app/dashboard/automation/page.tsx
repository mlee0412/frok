import React from 'react';
import { Card } from '@frok/ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AutomationPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Automation</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4">Workflows placeholder</Card>
        <Card className="p-4">Schedules placeholder</Card>
        <Card className="p-4">Agent tasks placeholder</Card>
      </div>
    </div>
  );
}
