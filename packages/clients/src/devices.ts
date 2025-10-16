import { safeFetch } from './base';

export type Device = {
  id: string;
  name: string;
  type?: 'light' | 'media_player' | 'climate' | 'sensor' | 'other';
  area?: string;
  online?: boolean;
};

export async function getDevices(): Promise<Device[]> {
  const res = await safeFetch<Device[]>('/devices');
  if (res.ok) return res.data;

  // demo fallback
  return [
    {
      id: 'dev-001',
      name: 'Living Room TV',
      type: 'media_player',
      area: 'Living Room',
      online: true,
    },
    { id: 'dev-002', name: 'Hue Strip', type: 'light', area: 'Studio', online: true },
  ];
}
