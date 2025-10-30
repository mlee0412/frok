// C:\Dev\FROK\apps\web\src\app\layout.tsx
import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from '@frok/ui';
import { WebVitals } from '@/components/WebVitals';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

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
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <WebVitals />
        <ServiceWorkerProvider>
          <ThemeProvider>
            <Toaster>
              <QueryProvider>
                {children}
              </QueryProvider>
            </Toaster>
          </ThemeProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
