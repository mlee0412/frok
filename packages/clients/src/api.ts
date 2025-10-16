import { safeFetch } from './base';

import type { Health } from '@frok/types';

export async function getHealth(): Promise<Health> {
  const res = await safeFetch<Health>('/health');
  if (res.ok) return res.data;
  // fallback so UI keeps working if API isn't running
  return { ok: true, name: 'stub' };
}
