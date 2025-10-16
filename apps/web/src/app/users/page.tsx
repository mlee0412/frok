import React from 'react';
import { Card } from '@/components/ui/card';
import { getUsers } from '@frok/clients';
import type { User } from '@frok/types';

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((u: User) => (
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
