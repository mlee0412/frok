'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SideNav } from '@frok/ui';
import { useAuth } from '@/lib/useAuth';

export type NavItem = { label: string; href: string; disabled?: boolean };

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
  const router = useRouter();
  const { email, signOut } = useAuth();

  const LinkComponent = React.useCallback(
    ({ href = '#', ...rest }: React.ComponentPropsWithoutRef<'a'>) => (
      <Link href={href} {...rest} />
    ),
    [],
  );

  return (
    <SideNav
      items={items}
      header={header}
      footer={footer}
      activeHref={pathname}
      collapsible
      defaultCollapsed={false}
      linkComponent={LinkComponent}
      userEmail={email}
      onSignIn={() => router.push('/auth/sign-in')}
      onSignOut={() => signOut()}
    />
  );
}
