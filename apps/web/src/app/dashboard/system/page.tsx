'use client';
import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, Card } from '@frok/ui';
import DevicesTab from './DevicesTab';

export default function SystemPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initial = (searchParams.get('tab') || 'health') as 'health' | 'devices' | 'admin' | 'ui';
  const [tab, setTab] = React.useState(initial);

  React.useEffect(() => {
    const t = (searchParams.get('tab') || 'health') as typeof initial;
    if (t !== tab) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">System</h1>
      <Tabs
        items={[
          { value: 'health', label: 'Health' },
          { value: 'devices', label: 'Devices' },
          { value: 'admin', label: 'Admin' },
          { value: 'ui', label: 'UI Settings' },
        ]}
        value={tab}
        onValueChange={(v: any) => {
          setTab(v);
          const next = new URLSearchParams(searchParams.toString());
          next.set('tab', v);
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }}
      />
      <div>
        {tab === 'health' && (
          <Card className="p-6">System health placeholder</Card>
        )}
        {tab === 'devices' && (<DevicesTab />)}
        {tab === 'admin' && (
          <Card className="p-6">Admin tools placeholder</Card>
        )}
        {tab === 'ui' && (
          <Card className="p-6">UI settings placeholder</Card>
        )}
      </div>
    </div>
  );
}
