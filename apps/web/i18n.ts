// i18n configuration
export const locales = ['en', 'ko'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

// Load messages for a given locale
export async function getMessages(locale: Locale) {
  try {
    // Use explicit imports for better Vercel compatibility
    if (locale === 'ko') {
      return (await import('./messages/ko.json')).default;
    }
    return (await import('./messages/en.json')).default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // Fallback to English
    return (await import('./messages/en.json')).default;
  }
}
