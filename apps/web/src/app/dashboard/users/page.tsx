import React from 'react';
import { Card } from '@frok/ui';
import { getUsers } from '@frok/clients';
import type { User } from '@frok/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardUsersPage() {
  const users: User[] = await getUsers();
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((u) => (
          <Card key={u.id} className="p-4 space-y-1">
            <div className="font-medium">{u.name}</div>
            <div className="text-sm text-foreground/60">{u.role || 'role: n/a'} {u.email ? `• ${u.email}` : ''}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
