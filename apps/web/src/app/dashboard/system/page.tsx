import { Suspense } from 'react';
import SystemPageClient from './SystemPageClient';

function SystemPageFallback() {
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">Loading system data…</p>
    </div>
  );
}

export default function SystemPage() {
  return (
    <Suspense fallback={<SystemPageFallback />}>
      <SystemPageClient />
    </Suspense>
  );
}
