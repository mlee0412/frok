'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(href));
  const base = 'px-3 py-2 rounded block';
  const cls = active ? `${base} bg-gray-100 font-medium` : `${base} hover:bg-gray-50`;
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export default function SideNav() {
  return (
    <aside className="w-60 shrink-0 border-r">
      <div className="p-4 border-b font-semibold">
        <Link href="/">FROK</Link>
      </div>
      <nav className="p-3 text-sm grid gap-1">
        <Item href="/dashboard">Dashboard</Item>
        <Item href="/system">System</Item>
        <Item href="/smart-home">Smart Home</Item>
        <Item href="/users">Users</Item>
        <Item href="/devices">Devices</Item>
        <Item href="/github">GitHub</Item>
        <div className="mt-3 text-[11px] uppercase text-gray-400 px-3">More</div>
        <Item href="/automation">Automation</Item>
        <Item href="/finances">Finances</Item>
      </nav>
    </aside>
  );
}
