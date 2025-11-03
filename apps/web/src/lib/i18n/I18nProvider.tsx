'use client';

import React, { createContext, useContext } from 'react';
import type { Locale } from '../../../i18n';

type Messages = Record<string, any>;

type I18nContextType = {
  locale: Locale;
  messages: Messages;
  t: (key: string, variables?: Record<string, string | number>) => string;
};

export const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  // Translation function
  const t = React.useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      // Split key by dots (e.g., "common.save" -> ["common", "save"])
      const keys = key.split('.');
      let value: any = messages;

      // Navigate through nested keys
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Key not found, return the key itself
          console.warn(`Translation key not found: ${key}`);
          return key;
        }
      }

      // If value is not a string, return the key
      if (typeof value !== 'string') {
        console.warn(`Translation value is not a string: ${key}`);
        return key;
      }

      // Replace variables if provided
      if (variables) {
        return value.replace(/\{(\w+)\}/g, (match, varName) => {
          return varName in variables ? String(variables[varName]) : match;
        });
      }

      return value;
    },
    [messages]
  );

  return <I18nContext.Provider value={{ locale, messages, t }}>{children}</I18nContext.Provider>;
}

// Hook to use translations
export function useTranslations(namespace?: string) {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslations must be used within I18nProvider');
  }

  return React.useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return context.t(fullKey, variables);
    },
    [context, namespace]
  );
}

// Hook to get the current locale
export function useLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useLocale must be used within I18nProvider');
  }
  return context.locale;
}
