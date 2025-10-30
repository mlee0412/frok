import React from 'react';
import AutomationClient from './AutomationClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AutomationPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Automation</h1>
      <AutomationClient />
    </div>
  );
}
