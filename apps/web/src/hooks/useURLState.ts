'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook for managing state in URL search params
 * Useful for filters, tabs, pagination, etc.
 *
 * @example
 * const [tab, setTab] = useURLState('tab', 'overview');
 * // URL: /page?tab=overview
 * setTab('settings');
 * // URL: /page?tab=settings
 */
export function useURLState<T extends string = string>(
  key: string,
  defaultValue: T
): [T, (value: T | null) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = (searchParams.get(key) as T) || defaultValue;

  const setValue = useCallback(
    (newValue: T | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue === null || newValue === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      const search = params.toString();
      const url = search ? `${pathname}?${search}` : pathname;

      router.replace(url, { scroll: false });
    },
    [key, defaultValue, pathname, router, searchParams]
  );

  return [value, setValue];
}

/**
 * Hook for managing multiple URL params at once
 *
 * @example
 * const [params, setParams] = useURLParams({ tab: 'overview', page: '1' });
 * setParams({ tab: 'settings' }); // Updates only 'tab', keeps 'page'
 * setParams({ page: '2' }); // Updates only 'page', keeps 'tab'
 */
export function useURLParams<T extends Record<string, string>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build current params object
  const currentParams = { ...defaults } as T;
  Object.keys(defaults).forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      currentParams[key as keyof T] = value as T[keyof T];
    }
  });

  const setParams = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === defaults[key]) {
          params.delete(key);
        } else {
          params.set(key, value as string);
        }
      });

      const search = params.toString();
      const url = search ? `${pathname}?${search}` : pathname;

      router.replace(url, { scroll: false });
    },
    [defaults, pathname, router, searchParams]
  );

  return [currentParams, setParams];
}
