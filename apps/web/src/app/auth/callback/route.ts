import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Cookie setting can fail in server components
            }
          },
          remove(name: string, options) {
            try {
              cookieStore.delete(name);
            } catch {
              // Cookie deletion can fail in server components
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully exchanged code for session
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.error('[auth callback error]', error);
  }

  // Redirect to error page or sign-in page on failure
  return NextResponse.redirect(new URL('/auth/sign-in?error=auth_callback_failed', requestUrl.origin));
}
