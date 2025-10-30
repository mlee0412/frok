import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  fileUrls?: string[];
};

export type Thread = {
  id: string;
  title: string;
  agentId: string;
  createdAt?: number;
  updatedAt?: number;
  archived?: boolean;
  folder?: string;
  tags?: string[];
};

export type ChatState = {
  threads: Thread[];
  currentId: string | null;
  messages: Record<string, Message[]>;
  creating: boolean;
};

export type ChatActions = {
  // Thread management
  newThread: (title: string, agentId: string) => string;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  setCurrentThread: (threadId: string | null) => void;
  archiveThread: (threadId: string) => void;

  // Message management
  addUserMessage: (threadId: string, content: string, fileUrls?: string[]) => string;
  startAssistantMessage: (threadId: string) => string;
  appendAssistantToken: (threadId: string, messageId: string, token: string) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (threadId: string, messageId: string) => void;
  clearMessages: (threadId: string) => void;

  // Utility
  setCreating: (creating: boolean) => void;
  reset: () => void;
};

export type ChatStore = ChatState & ChatActions;

// Initial state
const initialState: ChatState = {
  threads: [],
  currentId: null,
  messages: {},
  creating: false,
};

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Thread management
      newThread: (title: string, agentId: string) => {
        const id = generateId();
        const newThread: Thread = {
          id,
          title: title || 'New Chat',
          agentId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          threads: [newThread, ...state.threads],
          currentId: id,
          messages: { ...state.messages, [id]: [] },
          creating: false,
        }));

        return id;
      },

      deleteThread: (threadId: string) => {
        set((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[threadId];

          return {
            threads: state.threads.filter((t) => t.id !== threadId),
            currentId: state.currentId === threadId ? null : state.currentId,
            messages: newMessages,
          };
        });
      },

      updateThread: (threadId: string, updates: Partial<Thread>) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId
              ? { ...t, ...updates, updatedAt: Date.now() }
              : t
          ),
        }));
      },

      setCurrentThread: (threadId: string | null) => {
        set({ currentId: threadId });
      },

      archiveThread: (threadId: string) => {
        get().updateThread(threadId, { archived: true });
      },

      // Message management
      addUserMessage: (threadId: string, content: string, fileUrls?: string[]) => {
        const messageId = generateId();
        const message: Message = {
          id: messageId,
          role: 'user',
          content,
          timestamp: Date.now(),
          fileUrls,
        };

        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: [...(state.messages[threadId] || []), message],
          },
        }));

        // Update thread's updatedAt
        get().updateThread(threadId, { updatedAt: Date.now() });

        return messageId;
      },

      startAssistantMessage: (threadId: string) => {
        const messageId = generateId();
        const message: Message = {
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: [...(state.messages[threadId] || []), message],
          },
        }));

        return messageId;
      },

      appendAssistantToken: (threadId: string, messageId: string, token: string) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: (state.messages[threadId] || []).map((msg) =>
              msg.id === messageId
                ? { ...msg, content: msg.content + token }
                : msg
            ),
          },
        }));
      },

      updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: (state.messages[threadId] || []).map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          },
        }));
      },

      deleteMessage: (threadId: string, messageId: string) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: (state.messages[threadId] || []).filter(
              (msg) => msg.id !== messageId
            ),
          },
        }));
      },

      clearMessages: (threadId: string) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: [],
          },
        }));
      },

      // Utility
      setCreating: (creating: boolean) => {
        set({ creating });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'frok-chat-store',
      version: 1,
      partialize: (state) => ({
        threads: state.threads,
        currentId: state.currentId,
        messages: state.messages,
        // Don't persist 'creating' flag
      }),
    }
  )
);
