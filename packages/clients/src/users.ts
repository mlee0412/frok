import { safeFetch } from './base';

import type { User } from '@frok/types';

export async function getUsers(): Promise<User[]> {
  const res = await safeFetch<unknown>('/users');
  if (res.ok) {
    const data = res.data;
    const isUserArray = (x: unknown): x is User[] => Array.isArray(x);
    const isUsersObj = (x: unknown): x is { users: User[] } =>
      typeof x === 'object' && x !== null && Array.isArray((x as Record<string, unknown>).users);
    if (isUserArray(data)) return data;
    if (isUsersObj(data)) return data.users;
  }

  // demo fallback
  return [
    { id: 'u1', name: 'Minki', role: 'Owner', email: 'minki@example.com' },
    { id: 'u2', name: 'Manager Kim', role: 'Manager', email: 'manager@example.com' },
  ];
}
