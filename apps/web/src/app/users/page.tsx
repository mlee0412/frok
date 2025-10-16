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
  const { q = '' } = searchParams;
  const users = await getUsers();
  const query = (q || '').toLowerCase().trim();
  const filtered = query
    ? users.filter((u) =>
        [u.name, u.email, u.role].filter(Boolean).some((v) => String(v).toLowerCase().includes(query)),
      )
    : users;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <form method="get" className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q || ''}
          placeholder="Search name, email, role"
          className="border rounded px-3 py-2 text-sm"
        />
        <button type="submit" className="border rounded px-3 py-2 text-sm">Search</button>
        <a href="/users" className="text-sm text-cyan-600 hover:underline">Clear</a>
      </form>
      <div className="text-xs text-gray-500">Showing {filtered.length} of {users.length}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((u: User) => (
          <Card key={u.id}>
            <div className="font-medium">{u.name}</div>
            <div className="text-sm text-gray-500">
              {u.role || 'role: n/a'} {u.email ? `• ${u.email}` : ''}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
