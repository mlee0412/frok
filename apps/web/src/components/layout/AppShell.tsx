import React from 'react';
import SideNav from '@/components/layout/SideNav';

type Props = { children: React.ReactNode };

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen flex">
      <SideNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
