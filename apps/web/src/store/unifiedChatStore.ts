import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Core Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
export type MessageSource = 'text' | 'voice';

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  source?: MessageSource;
  fileUrls?: string[];
  metadata?: {
    voiceTranscription?: string;
    toolCalls?: ToolCall[];
    thinkingProcess?: string;
    [key: string]: unknown;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: 'pending' | 'success' | 'error';
}

export interface Thread {
  id: string;
  title: string;
  agentId: string;
  createdAt: number;
  updatedAt: number;
  lastMessageAt?: number;
  archived?: boolean;
  pinned?: boolean;
  folder?: string;
  tags?: string[];
  messageCount?: number;
  metadata?: {
    toolsEnabled?: boolean;
    enabledTools?: string[];
    model?: string;
    agentStyle?: string;
    projectContext?: string;
    [key: string]: unknown;
  };
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  systemPrompt?: string;
  capabilities?: string[];
}

// ============================================================================
// Store State Interface
// ============================================================================

interface UnifiedChatState {
  // Thread Management
  threads: Thread[];
  activeThreadId: string | null;
  threadLoading: boolean;

  // Message Management
  messages: Record<string, Message[]>; // threadId -> messages[]
  streamingMessageId: string | null;
  messageLoading: boolean;

  // Voice State
  voiceMode: VoiceState;
  voiceTranscript: string; // Current user utterance being transcribed
  voiceResponse: string; // Current assistant response being streamed
  voiceConnected: boolean;
  voiceConnecting: boolean;
  voiceError: string | null;

  // Voice Settings (Persisted)
  voiceId: string | null; // ElevenLabs voice ID
  autoStartVoice: boolean;
  vadSensitivity: number; // Voice Activity Detection threshold

  // UI State (Ephemeral)
  isSidebarOpen: boolean;
  isVoiceSheetOpen: boolean;
  selectedMessageId: string | null;

  // Agent Management
  availableAgents: Agent[];
  activeAgent: Agent | null;

  // Input State
  draftMessage: Record<string, string>; // threadId -> draft text
}

interface UnifiedChatActions {
  // ===== Thread Actions =====
  createThread: (title: string, agentId: string) => string;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  setActiveThread: (threadId: string | null) => void;
  archiveThread: (threadId: string) => void;
  pinThread: (threadId: string, pinned: boolean) => void;
  setThreadLoading: (loading: boolean) => void;

  // ===== Message Actions =====
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (threadId: string, messageId: string) => void;
  clearMessages: (threadId: string) => void;
  setStreamingMessageId: (messageId: string | null) => void;
  appendStreamingContent: (threadId: string, messageId: string, content: string) => void;
  setMessageLoading: (loading: boolean) => void;

  // ===== Voice Actions =====
  setVoiceMode: (mode: VoiceState) => void;
  setVoiceConnected: (connected: boolean) => void;
  setVoiceConnecting: (connecting: boolean) => void;
  setVoiceError: (error: string | null) => void;
  setVoiceTranscript: (transcript: string) => void;
  appendVoiceResponse: (token: string) => void;
  clearVoiceTranscript: () => void;
  clearVoiceResponse: () => void;
  finalizeVoiceMessage: (threadId: string) => void;

  // ===== Voice Settings =====
  setVoiceId: (voiceId: string) => void;
  setAutoStartVoice: (autoStart: boolean) => void;
  setVadSensitivity: (sensitivity: number) => void;

  // ===== UI Actions =====
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleVoiceSheet: () => void;
  setVoiceSheetOpen: (open: boolean) => void;
  setSelectedMessage: (messageId: string | null) => void;

  // ===== Agent Actions =====
  setAvailableAgents: (agents: Agent[]) => void;
  setActiveAgent: (agent: Agent | null) => void;

  // ===== Draft Actions =====
  setDraftMessage: (threadId: string, draft: string) => void;
  clearDraftMessage: (threadId: string) => void;

  // ===== Utility =====
  reset: () => void;
}

export type UnifiedChatStore = UnifiedChatState & UnifiedChatActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: UnifiedChatState = {
  // Thread Management
  threads: [],
  activeThreadId: null,
  threadLoading: false,

  // Message Management
  messages: {},
  streamingMessageId: null,
  messageLoading: false,

  // Voice State
  voiceMode: 'idle',
  voiceTranscript: '',
  voiceResponse: '',
  voiceConnected: false,
  voiceConnecting: false,
  voiceError: null,

  // Voice Settings (Persisted)
  voiceId: null,
  autoStartVoice: false,
  vadSensitivity: 0.01,

  // UI State (Ephemeral)
  isSidebarOpen: true,
  isVoiceSheetOpen: false,
  selectedMessageId: null,

  // Agent Management
  availableAgents: [],
  activeAgent: null,

  // Input State
  draftMessage: {},
};

// ============================================================================
// Utility Functions
// ============================================================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ============================================================================
// Store Implementation
// ============================================================================

export const useUnifiedChatStore = create<UnifiedChatStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== Thread Actions =====

      createThread: (title: string, agentId: string) => {
        const id = generateId();
        const now = Date.now();
        const newThread: Thread = {
          id,
          title: title || 'New Chat',
          agentId,
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
        };

        set((state) => ({
          threads: [newThread, ...state.threads],
          activeThreadId: id,
          messages: { ...state.messages, [id]: [] },
        }));

        return id;
      },

      deleteThread: (threadId: string) => {
        set((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[threadId];

          const newDrafts = { ...state.draftMessage };
          delete newDrafts[threadId];

          return {
            threads: state.threads.filter((t) => t.id !== threadId),
            activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
            messages: newMessages,
            draftMessage: newDrafts,
          };
        });
      },

      updateThread: (threadId: string, updates: Partial<Thread>) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        }));
      },

      setActiveThread: (threadId: string | null) => {
        set({ activeThreadId: threadId });
      },

      archiveThread: (threadId: string) => {
        get().updateThread(threadId, { archived: true });
      },

      pinThread: (threadId: string, pinned: boolean) => {
        get().updateThread(threadId, { pinned });
      },

      setThreadLoading: (loading: boolean) => {
        set({ threadLoading: loading });
      },

      // ===== Message Actions =====

      addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => {
        const messageId = generateId();
        const now = Date.now();
        const newMessage: Message = {
          ...message,
          id: messageId,
          timestamp: now,
        };

        set((state) => {
          const threadMessages = state.messages[message.threadId] || [];
          return {
            messages: {
              ...state.messages,
              [message.threadId]: [...threadMessages, newMessage],
            },
          };
        });

        // Update thread's lastMessageAt and messageCount
        get().updateThread(message.threadId, {
          lastMessageAt: now,
          messageCount: (get().messages[message.threadId]?.length || 0),
        });

        return messageId;
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
            [threadId]: (state.messages[threadId] || []).filter((msg) => msg.id !== messageId),
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
        get().updateThread(threadId, { messageCount: 0 });
      },

      setStreamingMessageId: (messageId: string | null) => {
        set({ streamingMessageId: messageId });
      },

      appendStreamingContent: (threadId: string, messageId: string, content: string) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: (state.messages[threadId] || []).map((msg) =>
              msg.id === messageId ? { ...msg, content: msg.content + content } : msg
            ),
          },
        }));
      },

      setMessageLoading: (loading: boolean) => {
        set({ messageLoading: loading });
      },

      // ===== Voice Actions =====

      setVoiceMode: (mode: VoiceState) => {
        set({ voiceMode: mode });
      },

      setVoiceConnected: (connected: boolean) => {
        set({ voiceConnected: connected });
      },

      setVoiceConnecting: (connecting: boolean) => {
        set({ voiceConnecting: connecting });
      },

      setVoiceError: (error: string | null) => {
        set({ voiceError: error });
      },

      setVoiceTranscript: (transcript: string) => {
        set({ voiceTranscript: transcript });
      },

      appendVoiceResponse: (token: string) => {
        set((state) => ({
          voiceResponse: state.voiceResponse + token,
        }));
      },

      clearVoiceTranscript: () => {
        set({ voiceTranscript: '' });
      },

      clearVoiceResponse: () => {
        set({ voiceResponse: '' });
      },

      finalizeVoiceMessage: (threadId: string) => {
        const { voiceTranscript, voiceResponse } = get();

        // Add user message (voice transcript)
        if (voiceTranscript.trim()) {
          get().addMessage({
            threadId,
            role: 'user',
            content: voiceTranscript,
            source: 'voice',
          });
        }

        // Add assistant message (voice response)
        if (voiceResponse.trim()) {
          get().addMessage({
            threadId,
            role: 'assistant',
            content: voiceResponse,
            source: 'voice',
          });
        }

        // Clear voice state
        get().clearVoiceTranscript();
        get().clearVoiceResponse();
        get().setVoiceMode('idle');
      },

      // ===== Voice Settings =====

      setVoiceId: (voiceId: string) => {
        set({ voiceId });
      },

      setAutoStartVoice: (autoStart: boolean) => {
        set({ autoStartVoice: autoStart });
      },

      setVadSensitivity: (sensitivity: number) => {
        // Clamp between 0.001 and 0.1
        const clamped = Math.max(0.001, Math.min(0.1, sensitivity));
        set({ vadSensitivity: clamped });
      },

      // ===== UI Actions =====

      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ isSidebarOpen: open });
      },

      toggleVoiceSheet: () => {
        const state = get();
        const isClosing = state.isVoiceSheetOpen;

        // When closing voice sheet, transfer voice transcript to text input draft
        if (isClosing && state.voiceTranscript.trim() && state.activeThreadId) {
          // Transfer voice transcript to draft message for seamless text mode switching
          get().setDraftMessage(state.activeThreadId, state.voiceTranscript);
          get().clearVoiceTranscript();
        }

        set((state) => ({ isVoiceSheetOpen: !state.isVoiceSheetOpen }));
      },

      setVoiceSheetOpen: (open: boolean) => {
        const state = get();

        // When closing voice sheet, transfer voice transcript to text input draft
        if (state.isVoiceSheetOpen && !open && state.voiceTranscript.trim() && state.activeThreadId) {
          get().setDraftMessage(state.activeThreadId, state.voiceTranscript);
          get().clearVoiceTranscript();
        }

        set({ isVoiceSheetOpen: open });
      },

      setSelectedMessage: (messageId: string | null) => {
        set({ selectedMessageId: messageId });
      },

      // ===== Agent Actions =====

      setAvailableAgents: (agents: Agent[]) => {
        set({ availableAgents: agents });
      },

      setActiveAgent: (agent: Agent | null) => {
        set({ activeAgent: agent });
      },

      // ===== Draft Actions =====

      setDraftMessage: (threadId: string, draft: string) => {
        set((state) => ({
          draftMessage: {
            ...state.draftMessage,
            [threadId]: draft,
          },
        }));
      },

      clearDraftMessage: (threadId: string) => {
        set((state) => {
          const newDrafts = { ...state.draftMessage };
          delete newDrafts[threadId];
          return { draftMessage: newDrafts };
        });
      },

      // ===== Utility =====

      reset: () => {
        set({
          ...initialState,
          // Keep persisted settings
          voiceId: get().voiceId,
          autoStartVoice: get().autoStartVoice,
          vadSensitivity: get().vadSensitivity,
        });
      },
    }),
    {
      name: 'unified-chat-store',
      version: 1,
      // Only persist specific fields
      partialize: (state) => ({
        threads: state.threads,
        activeThreadId: state.activeThreadId,
        messages: state.messages,
        voiceId: state.voiceId,
        autoStartVoice: state.autoStartVoice,
        vadSensitivity: state.vadSensitivity,
        draftMessage: state.draftMessage,
      }),
    }
  )
);

// ============================================================================
// Selector Hooks (Performance Optimization)
// ============================================================================

/**
 * Select only the active thread
 */
export const useActiveThread = () =>
  useUnifiedChatStore((state) => {
    const thread = state.threads.find((t) => t.id === state.activeThreadId);
    return thread || null;
  });

/**
 * Select messages for a specific thread
 * Uses stable empty array reference to prevent infinite re-renders
 */
const EMPTY_MESSAGES: Message[] = [];

export const useThreadMessages = (threadId: string | null) =>
  useUnifiedChatStore((state) =>
    threadId ? state.messages[threadId] || EMPTY_MESSAGES : EMPTY_MESSAGES
  );

/**
 * Select voice state
 * Uses shallow comparison to prevent re-renders when values haven't changed
 */
export const useVoiceState = () =>
  useUnifiedChatStore(
    useShallow((state) => ({
      mode: state.voiceMode,
      connected: state.voiceConnected,
      connecting: state.voiceConnecting,
      transcript: state.voiceTranscript,
      response: state.voiceResponse,
      error: state.voiceError,
    }))
  );

/**
 * Select voice settings
 * Uses shallow comparison to prevent re-renders when values haven't changed
 */
export const useVoiceSettings = () =>
  useUnifiedChatStore(
    useShallow((state) => ({
      voiceId: state.voiceId,
      autoStart: state.autoStartVoice,
      vadSensitivity: state.vadSensitivity,
    }))
  );

/**
 * Select UI state
 * Uses shallow comparison to prevent re-renders when values haven't changed
 */
export const useUIState = () =>
  useUnifiedChatStore(
    useShallow((state) => ({
      isSidebarOpen: state.isSidebarOpen,
      isVoiceSheetOpen: state.isVoiceSheetOpen,
      selectedMessageId: state.selectedMessageId,
    }))
  );

/**
 * Select draft message for a specific thread
 */
export const useDraftMessage = (threadId: string | null) =>
  useUnifiedChatStore((state) => (threadId ? state.draftMessage[threadId] || '' : ''));
