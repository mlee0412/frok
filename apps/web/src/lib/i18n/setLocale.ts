import { locales, type Locale } from '../../../i18n';

// Client-side: Get locale from cookie or localStorage
export function getLocaleClient(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }

  // Check cookie
  const cookies = document.cookie.split(';');
  const localeCookie = cookies
    .find((cookie) => cookie.trim().startsWith('NEXT_LOCALE='))
    ?.split('=')[1];

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  return 'en';
}

// Set locale (client-side only)
export function setLocale(locale: Locale) {
  if (typeof window === 'undefined') return;

  // Set cookie
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;

  // Reload page to apply new locale
  window.location.reload();
}
