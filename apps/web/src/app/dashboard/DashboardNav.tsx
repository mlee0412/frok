'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { SideNav } from '@frok/ui';

export type NavItem = { label: string; href: string };

export default function DashboardNav({
  items,
  header,
  footer,
}: {
  items: NavItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  return (
    <SideNav
      items={items}
      header={header}
      footer={footer}
      activeHref={pathname}
      collapsible
      defaultCollapsed={false}
    />
  );
}
