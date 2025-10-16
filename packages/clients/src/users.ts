import { safeFetch } from './base';

import type { User } from '@frok/types';

export async function getUsers(): Promise<User[]> {
  const res = await safeFetch<any>('/users');
  if (res.ok) {
    const data: any = res.data;
    if (Array.isArray(data)) return data as User[];
    if (data && Array.isArray(data.users)) return data.users as User[];
  }

  // demo fallback
  return [
    { id: 'u1', name: 'Minki', role: 'Owner', email: 'minki@example.com' },
    { id: 'u2', name: 'Manager Kim', role: 'Manager', email: 'manager@example.com' },
  ];
}
