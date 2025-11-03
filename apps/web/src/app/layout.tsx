// C:\Dev\FROK\apps\web\src\app\layout.tsx
import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from '@frok/ui';
import { WebVitals } from '@/components/WebVitals';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { getLocale } from '@/lib/i18n/getLocale';
import { getMessages } from '../../i18n';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FROK - AI Personal Assistant',
  description: 'Full-stack AI-powered personal assistant application',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FROK',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-152.svg', sizes: '152x152', type: 'image/svg+xml' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get the current locale from middleware
  const locale = await getLocale();

  // Load messages for the current locale
  const messages = await getMessages(locale);

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <WebVitals />
          <PerformanceMonitor />
          <ServiceWorkerProvider>
            <ThemeProvider>
              <Toaster>
                <QueryProvider>
                  {children}
                </QueryProvider>
              </Toaster>
            </ThemeProvider>
          </ServiceWorkerProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
