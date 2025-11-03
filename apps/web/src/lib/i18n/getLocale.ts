import { headers, cookies } from 'next/headers';
import { defaultLocale, type Locale, locales } from '../../../i18n';

// Server-side: Get locale from headers (set by middleware)
export async function getLocale(): Promise<Locale> {
  try {
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
  } catch (error) {
    console.error('Error getting locale from headers/cookies:', error);
  }

  return defaultLocale;
}
