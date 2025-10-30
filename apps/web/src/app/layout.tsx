// C:\Dev\FROK\apps\web\src\app\layout.tsx
import '../styles/globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from '@frok/ui';
import { WebVitals } from '@/components/WebVitals';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FROK Assistant',
  description: 'Unified personal + business dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <WebVitals />
        <ThemeProvider>
          <Toaster>
            <QueryProvider>
              {children}
            </QueryProvider>
          </Toaster>
        </ThemeProvider>
      </body>
    </html>
  );
}
