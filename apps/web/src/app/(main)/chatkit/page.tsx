'use client';

import * as React from 'react';
import { useChatKit } from '@openai/chatkit-react';
import dynamic from 'next/dynamic';

const ChatKitNoSSR = dynamic(() => import('@openai/chatkit-react').then(m => m.ChatKit), { ssr: false });

export default function ChatKitPage() {
  const [status, setStatus] = React.useState<'idle' | 'fetching' | 'ok' | 'error'>('idle');
  const [message, setMessage] = React.useState<string>('');
  const fallbackRef = React.useRef<HTMLDivElement | null>(null);

  const getClientSecretFn = React.useCallback(async (currentClientSecret?: string | null) => {
    try {
      setStatus('fetching');
      if (!currentClientSecret) {
        const res = await fetch('/api/chatkit/start', { method: 'POST' });
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          console.log('chatkit/start response', json);
          const token = json?.client_secret ?? null;
          setStatus(token ? 'ok' : 'error');
          if (!token) setMessage(typeof json?.error === 'string' ? json.error : 'missing client_secret');
          return token;
        } catch (e) {
          console.error('chatkit/start non-JSON', text);
          setStatus('error');
          setMessage('invalid JSON from /api/chatkit/start');
          return null;
        }
      }
      const res = await fetch('/api/chatkit/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentClientSecret }),
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log('chatkit/refresh response', json);
        const token = json?.client_secret ?? null;
        setStatus(token ? 'ok' : 'error');
        if (!token) setMessage(typeof json?.error === 'string' ? json.error : 'missing client_secret');
        return token;
      } catch (e) {
        console.error('chatkit/refresh non-JSON', text);
        setStatus('error');
        setMessage('invalid JSON from /api/chatkit/refresh');
        return null;
      }
    } catch {
      return null;
    }
  }, []);

  const { control, focusComposer, setThreadId, sendUserMessage, fetchUpdates } = useChatKit({
    api: {
      async getClientSecret(currentClientSecret?: string | null) {
        return getClientSecretFn(currentClientSecret);
      },
    },
    onError: ({ error }) => {
      console.error('[chatkit error]', error);
      setMessage(error?.message || 'chatkit error');
      setStatus('error');
    },
    onLog: ({ name, data }) => {
      console.debug('[chatkit log]', name, data);
    },
    onThreadChange: ({ threadId }) => {
      console.debug('[chatkit] thread change', threadId);
    },
    onResponseStart: () => {
      console.debug('[chatkit] response start');
    },
    onResponseEnd: () => {
      console.debug('[chatkit] response end');
    },
  });

  React.useEffect(() => {
    // Nudge ChatKit to initialize so it requests a token via getClientSecret
    (async () => {
      try {
        await setThreadId(null);
        await fetchUpdates();
        await focusComposer();
      } catch (e) {
        console.warn('chatkit init error', e);
      }
    })();
  }, [setThreadId, fetchUpdates, focusComposer]);

  React.useEffect(() => {
    if (status !== 'ok') return;
    (async () => {
      try {
        // Ensure a visible composer/thread after token is ready
        await setThreadId(null);
        await focusComposer();
        await fetchUpdates();
      } catch (e) {
        console.warn('chatkit post-ok init error', e);
      }
    })();
  }, [status, setThreadId, focusComposer, fetchUpdates]);

  React.useEffect(() => {
    // Expose control for debugging in DevTools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).chatkitControl = control;
    console.log('ChatKit control ready', control);
  }, [control]);

  const ensureChatKitWebComponent = React.useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (customElements.get('openai-chatkit')) return;

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-chatkit-web-component]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load ChatKit web component script (cached)')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.openai.com/chatkit/chatkit.js';
      script.dataset['chatkitWebComponent'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load ChatKit web component script'));
      document.head.appendChild(script);
    });
  }, []);

  return (
    <div style={{ height: '100%', minHeight: 600, position: 'relative' }}>
      <ChatKitNoSSR control={control} style={{ height: 600, width: '100%' }} />
      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, zIndex: 9999 }}>
        <div>status: {status}</div>
        {message ? <div>msg: {message}</div> : null}
        <button
          onClick={async () => {
            console.log('[btn] test token click');
            setStatus('fetching');
            try {
              const r = await fetch('/api/chatkit/start', { method: 'POST' });
              const j = await r.json();
              console.log('manual /api/chatkit/start', j);
              const token = j?.client_secret ?? null;
              setStatus(token ? 'ok' : 'error');
              if (!token) setMessage(typeof j?.error === 'string' ? j.error : 'missing client_secret');
            } catch (e: any) {
              setStatus('error');
              setMessage(e?.message || 'request failed');
            }
          }}
          style={{ marginTop: 6, background: '#0ea5e9', color: '#000', borderRadius: 4, padding: '4px 8px' }}
        >
          test token
        </button>
        <button
          onClick={async () => {
            console.log('[btn] new thread click', { hasSetThreadId: !!setThreadId, hasFocusComposer: !!focusComposer, hasFetchUpdates: !!fetchUpdates });
            try {
              await setThreadId(null);
              await focusComposer();
              await fetchUpdates();
              setMessage('started new thread');
            } catch (e) {
              console.warn('failed to start new thread', e);
              setMessage('failed to start new thread');
            }
          }}
          style={{ marginTop: 6, marginLeft: 8, background: '#34d399', color: '#000', borderRadius: 4, padding: '4px 8px' }}
        >
          new thread
        </button>
        <button
          onClick={async () => {
            console.log('[btn] send hello click', { hasSendUserMessage: !!sendUserMessage });
            try {
              // Force send a message to materialize UI
              await sendUserMessage({ text: 'hello', newThread: true });
              setMessage('sent hello');
            } catch (e) {
              console.warn('failed to send hello', e);
              setMessage('failed to send hello');
            }
          }}
          style={{ marginTop: 6, marginLeft: 8, background: '#fbbf24', color: '#000', borderRadius: 4, padding: '4px 8px' }}
        >
          send hello
        </button>
        <button
          onClick={async () => {
            console.log('[btn] fallback render click', { hasFallbackRef: !!fallbackRef.current });
            try {
              if (!fallbackRef.current) return;
              await ensureChatKitWebComponent();
              // Create web component fallback
              const el = document.createElement('openai-chatkit') as any;
              el.setOptions({
                api: { async getClientSecret(current?: string | null) { return getClientSecretFn(current); } },
              });
              el.style.height = '600px';
              el.style.width = '100%';
              fallbackRef.current.innerHTML = '';
              fallbackRef.current.appendChild(el);
            } catch (e) {
              console.warn('fallback render failed', e);
            }
          }}
          style={{ marginTop: 6, marginLeft: 8, background: '#a78bfa', color: '#000', borderRadius: 4, padding: '4px 8px' }}
        >
          fallback render
        </button>
      </div>
      <div ref={fallbackRef} />
    </div>
  );
}
