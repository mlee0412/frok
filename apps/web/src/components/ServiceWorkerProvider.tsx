'use client';

import React from 'react';
import { register, isStandalone } from '@/lib/serviceWorker';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { useTranslations } from '@/lib/i18n/I18nProvider';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('pwa.update');
  const [showUpdatePrompt, setShowUpdatePrompt] = React.useState(false);
  const [registration, setRegistration] = React.useState<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    // Register service worker
    register({
      onSuccess: (reg) => {
        console.log('[App] Service worker registered successfully');
        setRegistration(reg);
      },
      onUpdate: (reg) => {
        console.log('[App] New service worker available');
        setShowUpdatePrompt(true);
        setRegistration(reg);
      },
      onError: (error) => {
        console.error('[App] Service worker registration error:', error);
      },
    });

    // Log PWA install status
    if (isStandalone()) {
      console.log('[App] Running as installed PWA');
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Listen for controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  };

  return (
    <>
      {children}

      {/* Install Prompt */}
      <PWAInstallPrompt />

      {/* Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-surface p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
              <p className="mt-1 text-xs text-foreground/70">
                {t('description')}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                >
                  {t('update')}
                </button>
                <button
                  onClick={() => setShowUpdatePrompt(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface"
                >
                  {t('later')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
