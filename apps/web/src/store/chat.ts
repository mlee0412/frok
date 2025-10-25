import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Msg = { id: string; role: 'user' | 'assistant' | 'system'; content: string };
export type Thread = { id: string; title: string; agentId: string; pinned?: boolean; archived?: boolean; deleted_at?: string | null; toolsEnabled?: boolean };

type ChatState = {
  threads: Thread[];
  currentId: string | null;
  messages: Record<string, Msg[]>;
  creating: boolean;
  setCurrent: (id: string) => void;
  setAll: (threads: Thread[], messages: Record<string, Msg[]>, currentId?: string | null) => void;
  setThreadMessages: (threadId: string, msgs: Msg[]) => void;
  upsertThread: (t: Partial<Thread> & { id: string }) => void;
  setThreadFlags: (id: string, flags: Partial<Pick<Thread, 'pinned' | 'archived' | 'deleted_at' | 'toolsEnabled'>>) => void;
  upsertMessage: (threadId: string, msg: Msg) => void;
  newThread: (title?: string, agentId?: string) => string;
  renameThread: (id: string, title: string) => void;
  setAgent: (id: string, agentId: string) => void;
  addUserMessage: (threadId: string, content: string) => string; // returns msg id
  startAssistantMessage: (threadId: string) => string; // returns msg id
  appendAssistantToken: (threadId: string, msgId: string, token: string) => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      threads: [{ id: 't1', title: 'Welcome', agentId: 'default' }],
      currentId: 't1',
      messages: { t1: [] },
      creating: false,
      setCurrent: (id) => set({ currentId: id }),
      setAll: (threads, messages, currentId) => set({ threads, messages, currentId: typeof currentId === 'undefined' ? (threads[0]?.id ?? null) : currentId }),
      setThreadMessages: (threadId, msgs) => set((s) => ({ messages: { ...s.messages, [threadId]: msgs } })),
      upsertThread: (t) => set((s) => ({
        threads: s.threads.some((x) => x.id === t.id)
          ? s.threads.map((x) => (x.id === t.id ? { ...x, ...t } : x))
          : [t as Thread, ...s.threads],
      })),
      setThreadFlags: (id, flags) => set((s) => ({
        threads: s.threads.map((t) => (t.id === id ? { ...t, ...flags } : t)),
      })),
      upsertMessage: (threadId, msg) => set((s) => ({
        messages: {
          ...s.messages,
          [threadId]: (() => {
            const arr = s.messages[threadId] || [];
            const i = arr.findIndex((m) => m.id === msg.id);
            if (i >= 0) {
              const copy = arr.slice();
              copy[i] = msg;
              return copy;
            }
            return [...arr, msg];
          })(),
        },
      })),
      newThread: (title = 'New chat', agentId = 'default') => {
        const id = Math.random().toString(36).slice(2);
        set((s) => ({
          threads: [{ id, title, agentId }, ...s.threads],
          currentId: id,
          messages: { ...s.messages, [id]: [] },
        }));
        return id;
      },
      renameThread: (id, title) => set((s) => ({ threads: s.threads.map((t) => (t.id === id ? { ...t, title } : t)) })),
      setAgent: (id, agentId) => set((s) => ({ threads: s.threads.map((t) => (t.id === id ? { ...t, agentId } : t)) })),
      addUserMessage: (threadId, content) => {
        const id = 'm_' + Math.random().toString(36).slice(2);
        set((s) => ({ messages: { ...s.messages, [threadId]: [...(s.messages[threadId] || []), { id, role: 'user', content }] } }));
        return id;
      },
      startAssistantMessage: (threadId) => {
        const id = 'm_' + Math.random().toString(36).slice(2);
        set((s) => ({ messages: { ...s.messages, [threadId]: [...(s.messages[threadId] || []), { id, role: 'assistant', content: '' }] } }));
        return id;
      },
      appendAssistantToken: (threadId, msgId, token) => {
        set((s) => ({
          messages: {
            ...s.messages,
            [threadId]: (s.messages[threadId] || []).map((m) => (m.id === msgId ? { ...m, content: m.content + token } : m)),
          },
        }));
      },
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ threads: s.threads, messages: s.messages, currentId: s.currentId }),
    }
  )
);
