'use client';
import * as React from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@frok/ui';

export default function SignInPage() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [err, setErr] = React.useState<string | null>(null);
  const router = useRouter();

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setStatus('sending');
    const supa = supabaseClient();
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (e: any) {
      setErr(e?.message || 'Failed to send magic link');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-4">
        <div className="text-lg font-semibold mb-2">Sign in</div>
        <form onSubmit={sendMagicLink} className="space-y-3">
          <div>
            <label className="block text-xs text-foreground/60 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className="w-full border border-border rounded px-3 py-2 bg-transparent"
              placeholder="you@example.com"
            />
          </div>
          <Button
            type="submit"
            disabled={status === 'sending' || !email.trim()}
            variant="primary"
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
        {status === 'sent' && (
          <div className="text-sm text-foreground/70 mt-3">Check your email for the sign-in link.</div>
        )}
        {err && <div className="text-sm text-danger mt-3">{err}</div>}
        <div className="text-xs text-foreground/60 mt-4">After clicking the link, you&apos;ll be redirected back here.</div>
      </div>
    </div>
  );
}
