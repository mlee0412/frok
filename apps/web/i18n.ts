// i18n configuration
export const locales = ['en', 'ko'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

// Load messages for a given locale
export async function getMessages(locale: Locale) {
  try {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // Fallback to English
    return (await import(`./messages/en.json`)).default;
  }
}
