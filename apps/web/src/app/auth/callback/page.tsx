'use client';
import * as React from 'react';
import { Suspense } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = React.useState<'verifying' | 'done' | 'error'>('verifying');
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supa = supabaseClient();
    (async () => {
      try {
        const url = new URL(window.location.href);
        const query = url.searchParams;
        const hash = url.hash; // e.g. #access_token=...&refresh_token=...

        // 1) token_hash flow (when using email template with {{.TokenHash}})
        const token_hash = query.get('token_hash');
        if (token_hash) {
          const { error } = await supa.auth.verifyOtp({ token_hash, type: 'email' });
          if (error) throw error;
          setStatus('done');
          router.replace('/');
          return;
        }

        // 2) Implicit flow (default magic link) with tokens in URL hash
        if (hash && hash.includes('access_token=')) {
          const frag = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
          const access_token = frag.get('access_token');
          const refresh_token = frag.get('refresh_token');
          if (access_token && refresh_token) {
            const { error } = await supa.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            setStatus('done');
            router.replace('/');
            return;
          }
        }

        // 3) PKCE code flow (OAuth or PKCE-enabled magic link)
        const code = query.get('code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          setStatus('done');
          router.replace('/');
          return;
        }

        throw new Error('No recognizable auth parameters in callback URL');
      } catch (e: any) {
        setErr(e?.message || 'Failed to verify session');
        setStatus('error');
      }
    })();
  }, [router, params]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 text-sm">
        {status === 'verifying' && <div>Verifying sign-in…</div>}
        {status === 'done' && <div>Signed in. Redirecting…</div>}
        {status === 'error' && <div className="text-danger">{err}</div>}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center p-6">Verifying…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
