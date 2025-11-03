'use client';
import * as React from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Button } from '@frok/ui';
import { useTranslations } from '@/lib/i18n/I18nProvider';

export default function SignInPage() {
  const t = useTranslations('auth.signIn');
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [err, setErr] = React.useState<string | null>(null);

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
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : t('errorSending'));
      setStatus('error');
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-4">
        <div className="text-lg font-semibold mb-2">{t('title')}</div>
        <form onSubmit={sendMagicLink} className="space-y-3">
          <div>
            <label className="block text-xs text-foreground/60 mb-1">{t('emailLabel')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className="w-full border border-border rounded px-3 py-2 bg-transparent"
              placeholder={t('emailPlaceholder')}
            />
          </div>
          <Button
            type="submit"
            disabled={status === 'sending' || !email.trim()}
            variant="primary"
          >
            {status === 'sending' ? t('sending') : t('sendButton')}
          </Button>
        </form>
        {status === 'sent' && (
          <div className="text-sm text-foreground/70 mt-3">{t('successMessage')}</div>
        )}
        {err && <div className="text-sm text-danger mt-3">{err}</div>}
        <div className="text-xs text-foreground/60 mt-4">{t('redirectMessage')}</div>
      </div>
    </div>
  );
}
