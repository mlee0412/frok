/** Shared types and helpers for the clients package */

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const DEFAULT_BASE_URL = '/api'; // Next.js route default. Override via env if needed.

/** Resolve API base URL from environment or fall back to Next.js /api */
export function getApiBaseUrl(): string {
  const envBase =
    (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_API_BASE_URL) ||
    (typeof process !== 'undefined' && (process as any).env?.API_BASE_URL);

  return (envBase && envBase.trim()) || DEFAULT_BASE_URL;
}

export async function safeFetch<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        error: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/** Simple flag for SSR vs browser */
export const IS_BROWSER = typeof window !== 'undefined';
