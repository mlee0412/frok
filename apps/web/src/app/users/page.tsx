import React from 'react';
import { Card } from '@/components/ui/card';
import { getUsers } from '@frok/clients';
import type { User } from '@frok/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { redirect } = await import('next/navigation');
  redirect('/dashboard/users');
}
