import React from 'react';
import { Card } from '@/components/ui/card';

export default function AutomationPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Automation</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="font-medium">Workflows</div>
          <div className="text-sm text-gray-500">n8n flows, triggers, schedules (coming soon)</div>
        </Card>
        <Card>
          <div className="font-medium">Agent Tasks</div>
          <div className="text-sm text-gray-500">Queued jobs, recent runs (coming soon)</div>
        </Card>
      </div>
    </div>
  );
}
