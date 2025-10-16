import React from 'react';
import Link from 'next/link';

type Props = { children: React.ReactNode };

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r">
        <div className="p-4 border-b font-semibold">
          <Link href="/">FROK</Link>
        </div>
        <nav className="p-3 text-sm grid gap-1">
          <Link href="/dashboard" className="px-3 py-2 rounded hover:bg-gray-50">Dashboard</Link>
          <Link href="/system" className="px-3 py-2 rounded hover:bg-gray-50">System</Link>
          <Link href="/smart-home" className="px-3 py-2 rounded hover:bg-gray-50">Smart Home</Link>
          <Link href="/users" className="px-3 py-2 rounded hover:bg-gray-50">Users</Link>
          <Link href="/devices" className="px-3 py-2 rounded hover:bg-gray-50">Devices</Link>
          <Link href="/github" className="px-3 py-2 rounded hover:bg-gray-50">GitHub</Link>
          <div className="mt-3 text-[11px] uppercase text-gray-400 px-3">More</div>
          <Link href="/automation" className="px-3 py-2 rounded hover:bg-gray-50">Automation</Link>
          <Link href="/finances" className="px-3 py-2 rounded hover:bg-gray-50">Finances</Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
