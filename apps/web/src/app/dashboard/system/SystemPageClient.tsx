'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, Tabs } from '@frok/ui';

import DevicesTab from './DevicesTab';
import SystemHealthClient from './SystemHealthClient';

const TAB_OPTIONS = [
  { value: 'health', label: 'Health' },
  { value: 'devices', label: 'Devices' },
  { value: 'admin', label: 'Admin' },
  { value: 'ui', label: 'UI Settings' },
] as const;

type TabValue = (typeof TAB_OPTIONS)[number]['value'];

function getTabParam(searchParams: URLSearchParams): TabValue {
  const value = searchParams.get('tab');
  return (TAB_OPTIONS.some((option) => option.value === value) ? value : 'health') as TabValue;
}

export default function SystemPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = React.useMemo(() => getTabParam(searchParams), [searchParams]);
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  React.useEffect(() => {
    const nextTab = getTabParam(searchParams);
    if (nextTab !== tab) {
      setTab(nextTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = React.useCallback(
    (value: TabValue) => {
      setTab(value);
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">System</h1>
      <Tabs items={TAB_OPTIONS} value={tab} onValueChange={handleTabChange} />
      <div>
        {tab === 'health' && <SystemHealthClient />}
        {tab === 'devices' && <DevicesTab />}
        {tab === 'admin' && <Card className="p-6">Admin tools placeholder</Card>}
        {tab === 'ui' && <Card className="p-6">UI settings placeholder</Card>}
      </div>
    </div>
  );
}
