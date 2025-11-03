'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { setLocale } from '@/lib/i18n/getLocale';
import { locales, type Locale } from '../../i18n';

type LanguageSwitcherProps = {
  variant?: 'dropdown' | 'toggle';
  className?: string;
};

const languageNames: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
};

const languageFlags: Record<Locale, string> = {
  en: '🇺🇸',
  ko: '🇰🇷',
};

export function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const currentLocale = useLocale() as Locale;
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (locale: Locale) => {
    setLocale(locale);
    setIsOpen(false);
  };

  if (variant === 'toggle') {
    // Simple toggle between two languages
    const otherLocale = currentLocale === 'en' ? 'ko' : 'en';

    return (
      <button
        onClick={() => handleLanguageChange(otherLocale)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition rounded-lg hover:bg-gray-800 ${className}`}
        aria-label={`Switch to ${languageNames[otherLocale]}`}
      >
        <span className="text-lg">{languageFlags[otherLocale]}</span>
        <span className="hidden sm:inline">{languageNames[otherLocale]}</span>
      </button>
    );
  }

  // Dropdown variant
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition rounded-lg hover:bg-gray-800"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg">{languageFlags[currentLocale]}</span>
        <span className="hidden sm:inline">{languageNames[currentLocale]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-50">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLanguageChange(locale)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition ${
                currentLocale === locale
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              aria-current={currentLocale === locale ? 'true' : undefined}
            >
              <span className="text-lg">{languageFlags[locale]}</span>
              <span>{languageNames[locale]}</span>
              {currentLocale === locale && (
                <svg className="ml-auto w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
