'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useChatKit } from '@openai/chatkit-react';

type LauncherStatus = 'idle' | 'loading' | 'ready' | 'error';

const ChatKitNoSSR = dynamic(
  () => import('@openai/chatkit-react').then((mod) => mod.ChatKit),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        Preparing ChatKit…
      </div>
    ),
  }
);

export function ChatKitLauncher() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [status, setStatus] = React.useState<LauncherStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const getClientSecret = React.useCallback(
    async (currentClientSecret?: string | null): Promise<string> => {
      try {
        setError(null);
        setStatus('loading');
        const isRefresh = Boolean(currentClientSecret);
        const res = await fetch(isRefresh ? '/api/chatkit/refresh' : '/api/chatkit/start', {
          method: 'POST',
          headers: isRefresh ? { 'Content-Type': 'application/json' } : undefined,
          body: isRefresh ? JSON.stringify({ currentClientSecret }) : undefined,
        });

        const text = await res.text();
        let json: { client_secret?: string; error?: string };
        try {
          json = JSON.parse(text);
        } catch {
          setStatus('error');
          setError('Unexpected response from ChatKit session API.');
          return '';
        }

        const token = json?.client_secret ?? '';
        if (!token) {
          setStatus('error');
          setError(
            typeof json?.error === 'string'
              ? json.error
              : 'Unable to establish a ChatKit session.'
          );
          return '';
        }

        setStatus('ready');
        return token;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to reach ChatKit.';
        setStatus('error');
        setError(message);
        return '';
      }
    },
    []
  );

  const { control, setThreadId, focusComposer, fetchUpdates } = useChatKit({
    api: {
      async getClientSecret(currentClientSecret?: string | null) {
        return getClientSecret(currentClientSecret);
      },
    },
    onError: ({ error: err }) => {
      setStatus('error');
      setError(err?.message ?? 'ChatKit experienced an unexpected error.');
    },
    onLog: ({ name, data }) => {
      if (process.env["NODE_ENV"] !== 'production') {
        console.debug('[ChatKit]', name, data);
      }
    },
  });

  React.useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    (async () => {
      try {
        setStatus((prev) => (prev === 'ready' ? prev : 'loading'));
        await setThreadId(null);
        await fetchUpdates();
        await focusComposer();
        if (!cancelled) {
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to initialise ChatKit session.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, setThreadId, fetchUpdates, focusComposer]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const statusIndicator = React.useMemo(() => {
    const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium';
    switch (status) {
      case 'ready':
        return <span className={`${base} bg-emerald-500/10 text-emerald-300`}>Online</span>;
      case 'loading':
        return <span className={`${base} bg-sky-500/10 text-sky-300`}>Connecting…</span>;
      case 'error':
        return <span className={`${base} bg-rose-500/10 text-rose-300`}>Check connection</span>;
      default:
        return <span className={`${base} bg-slate-500/10 text-slate-300`}>Standby</span>;
    }
  }, [status]);

  const handleRetry = React.useCallback(() => {
    setStatus('loading');
    setError(null);
    void (async () => {
      try {
        await setThreadId(null);
        await fetchUpdates();
        await focusComposer();
      } catch (err) {
        setStatus('error');
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to refresh ChatKit session.'
        );
      }
    })();
  }, [setThreadId, fetchUpdates, focusComposer]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20"
        title="Open ChatKit experimental console"
      >
        ✨ ChatKit
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">OpenAI Labs</p>
                <h2 className="text-xl font-semibold text-white">ChatKit session</h2>
              </div>
              <div className="flex items-center gap-3">
                {statusIndicator}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                  aria-label="Close ChatKit"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="h-[520px] bg-slate-950">
              <ChatKitNoSSR control={control} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="border-t border-white/10 px-6 py-4 text-sm text-slate-300">
              {status === 'error' && error ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-rose-300">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-200 transition hover:border-rose-300 hover:bg-rose-500/20"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    ChatKit offers the official OpenAI conversation experience, including multi-modal uploads
                    and thread management.
                  </p>
                  <button
                    onClick={() => {
                      setStatus('loading');
                      setError(null);
                      void (async () => {
                        try {
                          await setThreadId(null);
                          await fetchUpdates();
                          await focusComposer();
                        } catch (err) {
                          setStatus('error');
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Unable to refresh ChatKit session.'
                          );
                        }
                      })();
                    }}
                    className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-200 transition hover:border-sky-300 hover:bg-sky-500/20"
                  >
                    Refresh session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
