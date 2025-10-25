'use client';
import * as React from 'react';
import type { Thread as ChatThread } from '@/lib/types/chat';
import { ChatSidebar, ThreadHeader, ChatMessage, ChatInput } from '@frok/ui';
import { useChatStore } from '@/store/chat';
import { getSession, listThreads, getThreadMessages, createThread, updateThreadTitle, updateThreadAgent, updateThreadFlags, deleteThread, insertMessage, updateMessageContent, subscribe } from '@/lib/chatRepo';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { joinThreadPresence, type PresenceControls } from '@/lib/presence';

const EMPTY_MESSAGES: any[] = [];

export default function Page() {
  return <ChatClient />;
}

function ChatClient() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const threads = useChatStore((s) => s.threads);
  const currentId = useChatStore((s) => s.currentId);
  const messages = useChatStore((s) => (s.currentId ? (s.messages[s.currentId] || EMPTY_MESSAGES) : EMPTY_MESSAGES));
  const setCurrent = useChatStore((s) => s.setCurrent);
  const setAll = useChatStore((s) => s.setAll);
  const setThreadMessages = useChatStore((s) => s.setThreadMessages);
  const upsertThread = useChatStore((s) => s.upsertThread);
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const newThread = useChatStore((s) => s.newThread);
  const setAgent = useChatStore((s) => s.setAgent);
  const renameThread = useChatStore((s) => s.renameThread);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const startAssistantMessage = useChatStore((s) => s.startAssistantMessage);
  const appendAssistantToken = useChatStore((s) => s.appendAssistantToken);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const agents = React.useMemo(() => [
    { id: 'default', name: 'Default' },
    { id: 'fast', name: 'Fast' },
    { id: 'ha-tools', name: 'Home Assistant' },
  ], []);

  const currentAgentId = React.useMemo(() => threads.find((t) => t.id === currentId)?.agentId || 'default', [threads, currentId]);

  const supaEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [usingSupa, setUsingSupa] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showArchived, setShowArchived] = React.useState(false);
  const [onlineCount, setOnlineCount] = React.useState(0);
  const [presenceTypingLabel, setPresenceTypingLabel] = React.useState<string | null>(null);
  const [assistantTyping, setAssistantTyping] = React.useState(false);
  const presenceRef = React.useRef<PresenceControls | null>(null);

  const visibleThreads = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = threads
      .filter((t) => !t.deleted_at)
      .filter((t) => (showArchived ? true : !t.archived))
      .filter((t) => (q ? (t.title || '').toLowerCase().includes(q) : true))
      .sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)));
    return list;
  }, [threads, search, showArchived]);

  type OutboxItem = { threadId: string; assistantId: string; agentId: string; text: string; ts: number };
  const OUTBOX_KEY = 'chat-outbox-v1';
  const readOutbox = React.useCallback((): OutboxItem[] => {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch { return []; }
  }, []);
  const writeOutbox = React.useCallback((items: OutboxItem[]) => {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items)); } catch {}
  }, []);
  const enqueueOutbox = React.useCallback((item: OutboxItem) => {
    const items = readOutbox();
    items.push(item);
    writeOutbox(items);
  }, [readOutbox, writeOutbox]);

  // Presence: join per-thread channel and track online count + typing labels
  React.useEffect(() => {
    if (!supaEnabled || !currentId) return;
    const key = email || 'anon';
    const ctrl = joinThreadPresence(currentId, key, { typing: false, email: email || undefined }, (state) => {
      // online count = number of presence keys
      const keys = Object.keys(state || {});
      setOnlineCount(keys.length);
      // typing label from others
      let label: string | null = null;
      for (const k of keys) {
        if (k === key) continue;
        const metas = (state as any)[k] as any[];
        if (Array.isArray(metas)) {
          for (const m of metas) {
            if (m?.typing) {
              label = m?.email ? `${m.email} is typing…` : 'Someone is typing…';
              break;
            }
          }
        }
        if (label) break;
      }
      setPresenceTypingLabel(label);
    });
    presenceRef.current = ctrl;
    return () => {
      try { ctrl.leave(); } catch {}
      presenceRef.current = null;
      setOnlineCount(0);
      setPresenceTypingLabel(null);
    };
  }, [supaEnabled, currentId, email]);

  async function doStream(text: string, threadId: string, assistantId: string, agentId: string) {
    // retry with simple backoff
    const attempts = [0, 500, 1500];
    setAssistantTyping(true);
    for (let i = 0; i < attempts.length; i++) {
      if (attempts[i] > 0) await new Promise((r) => setTimeout(r, attempts[i]));
      try {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, agentId, threadId }),
        });
        // Fallback if no stream support
        if (!r.body) {
          const full = await r.text();
          if (full) {
            appendAssistantToken(threadId, assistantId, full);
            if (usingSupa) await updateMessageContent(assistantId, full).catch(() => {});
          }
          setAssistantTyping(false);
          return;
        }
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let flushTimer: any = null;
        const flush = async () => {
          if (!buffer) return;
          appendAssistantToken(threadId, assistantId, buffer);
          if (usingSupa) {
            const fullContent = (useChatStore.getState().messages[threadId] || []).find((m: any) => m.id === assistantId)?.content || '';
            await updateMessageContent(assistantId, fullContent).catch(() => {});
          }
          buffer = '';
        };
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            buffer += chunk;
            if (!flushTimer) {
              flushTimer = setTimeout(async () => { flushTimer = null; await flush(); }, 250);
            }
          }
        }
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        await flush();
        setAssistantTyping(false);
        return; // success
      } catch (e) {
        // try next attempt
      }
    }
    // all attempts failed: enqueue for retry
    enqueueOutbox({ threadId, assistantId, agentId, text, ts: Date.now() });
    setAssistantTyping(false);
  }

  // Initial load via Supabase only when session exists
  React.useEffect(() => {
    if (!supaEnabled || !email) return;
    let unsub: (() => void) | null = null;
    (async () => {
      setUsingSupa(true);
      const th: ChatThread[] = await listThreads().catch(() => [] as ChatThread[]);
      if (th.length > 0) {
        const msgMap: Record<string, any[]> = {};
        for (const t of th) {
          msgMap[t.id] = await getThreadMessages(t.id).catch(() => []);
        }
        setAll(th, msgMap, th[0]?.id ?? currentId);
      }
      const sub = subscribe(upsertThread, (tid, m) => upsertMessage(tid, m));
      unsub = sub.unsubscribe;
    })();
    return () => { if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supaEnabled, email]);

  // Process outbox on mount and when online
  React.useEffect(() => {
    const process = async () => {
      const items = readOutbox();
      if (!items.length) return;
      const remaining: OutboxItem[] = [];
      for (const it of items) {
        const exists = (useChatStore.getState().messages[it.threadId] || []).some((m) => m.id === it.assistantId);
        if (!exists) continue; // skip if message no longer present
        try {
          await doStream(it.text, it.threadId, it.assistantId, it.agentId);
        } catch {
          remaining.push(it);
        }
      }
      writeOutbox(remaining);
    };
    process();
    const onOnline = () => process();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [readOutbox, writeOutbox]);

  async function send(text: string) {
    if (!currentId) return;
    const userMsgId = addUserMessage(currentId, text);
    if (usingSupa) {
      await insertMessage(currentId, { id: userMsgId, role: 'user', content: text }).catch(() => {});
    }
    const assistantId = startAssistantMessage(currentId);
    if (usingSupa) {
      await insertMessage(currentId, { id: assistantId, role: 'assistant', content: '' }).catch(() => {});
    }
    await doStream(text, currentId, assistantId, currentAgentId);
  }

  return (
    <div className="min-h-[100dvh] flex items-stretch overflow-hidden">
      <ChatSidebar
        threads={visibleThreads}
        currentId={currentId || undefined}
        onSelect={(id: string) => setCurrent(id)}
        onNew={async () => {
          const id = newThread('New chat', currentAgentId);
          if (usingSupa) await createThread({ id, title: 'New chat', agentId: currentAgentId }).catch(() => {});
        }}
        search={search}
        onSearch={setSearch}
        showArchived={showArchived}
        onToggleShowArchived={setShowArchived}
        onPin={async (id: string, pinned: boolean) => {
          useChatStore.getState().setThreadFlags(id, { pinned });
          if (usingSupa) await updateThreadFlags(id, { pinned }).catch(() => {});
        }}
        onArchive={async (id: string, archived: boolean) => {
          useChatStore.getState().setThreadFlags(id, { archived });
          if (usingSupa) await updateThreadFlags(id, { archived }).catch(() => {});
        }}
        onDelete={async (id: string) => {
          useChatStore.getState().setThreadFlags(id, { deleted_at: new Date().toISOString() });
          if (usingSupa) await deleteThread(id).catch(() => {});
          if (currentId === id) {
            const next = (useChatStore.getState().threads || []).find((t) => !t.deleted_at && !t.archived && t.id !== id)?.id || null;
            if (next) setCurrent(next);
          }
        }}
      />
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <ThreadHeader
          title={threads.find((t) => t.id === currentId)?.title || 'New chat'}
          agentId={currentAgentId}
          agents={agents}
          onChangeAgent={async (id: string) => {
            if (!currentId) return;
            setAgent(currentId, id);
            if (usingSupa) await updateThreadAgent(currentId, id).catch(() => {});
          }}
          userEmail={email}
          onSignIn={() => router.push('/auth/sign-in')}
          onSignOut={() => signOut()}
          editableTitle={Boolean(currentId)}
          onRename={async (title: string) => {
            if (!currentId) return;
            renameThread(currentId, title);
            if (usingSupa) await updateThreadTitle(currentId, title).catch(() => {});
          }}
          onlineCount={onlineCount}
          typingLabel={assistantTyping ? 'Assistant typing…' : presenceTypingLabel}
          toolsEnabled={Boolean(threads.find((t) => t.id === currentId)?.toolsEnabled)}
          onToggleTools={async (enabled: boolean) => {
            if (!currentId) return;
            useChatStore.getState().setThreadFlags(currentId, { toolsEnabled: enabled });
            if (usingSupa) await updateThreadFlags(currentId, { toolsEnabled: enabled }).catch(() => {});
          }}
        />
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m: any) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} />
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <div className="container-app">
            <ChatInput onSend={send} onTyping={(t: boolean) => presenceRef.current?.setTyping(t)} />
          </div>
        </div>
      </main>
    </div>
  );
}
