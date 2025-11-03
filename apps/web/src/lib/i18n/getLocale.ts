import { headers, cookies } from 'next/headers';
import { defaultLocale, type Locale, locales } from '../../../i18n';

// Server-side: Get locale from headers (set by middleware)
export async function getLocale(): Promise<Locale> {
  const headersList = await headers();
  const locale = headersList.get('x-locale');

  if (locale && locales.includes(locale as Locale)) {
    return locale as Locale;
  }

  // Fallback: check cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  return defaultLocale;
}

// Client-side: Get locale from cookie or localStorage
export function getLocaleClient(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  // Check cookie
  const cookies = document.cookie.split(';');
  const localeCookie = cookies
    .find((cookie) => cookie.trim().startsWith('NEXT_LOCALE='))
    ?.split('=')[1];

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  return defaultLocale;
}

// Set locale (client-side only)
export function setLocale(locale: Locale) {
  if (typeof window === 'undefined') return;

  // Set cookie
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;

  // Reload page to apply new locale
  window.location.reload();
}
