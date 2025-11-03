import { NextRequest, NextResponse } from 'next/server';

// Supported locales
const locales = ['en', 'ko'];
const defaultLocale = 'en';

function getLocale(request: NextRequest): string {
  // 1. Check for locale in cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parse accept-language header (e.g., "en-US,en;q=0.9,ko;q=0.8")
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0]?.trim().split('-')[0])
      .find((lang) => lang && locales.includes(lang));

    if (preferredLocale) {
      return preferredLocale;
    }
  }

  // 3. Default locale
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  // Get the locale
  const locale = getLocale(request);

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Set the locale header for server components to read
  requestHeaders.set('x-locale', locale);

  // Create response with updated headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set locale cookie if not already set or different
  const currentLocaleCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (currentLocaleCookie !== locale) {
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }

  return response;
}

export const config = {
  // Match all pathnames except for:
  // - /api routes (API endpoints)
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - /favicon.ico, /sitemap.xml, /robots.txt (static files)
  // - /manifest.json, /sw.js (PWA files)
  // - /icon-*.png (PWA icons)
  matcher: ['/((?!api|_next|_vercel|favicon.ico|sitemap.xml|robots.txt|manifest.json|sw.js|icon-.*\\.png).*)'],
};
