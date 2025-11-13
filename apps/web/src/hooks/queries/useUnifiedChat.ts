import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useUnifiedChatStore, type Thread, type Message } from '@/store/unifiedChatStore';
import type { ChatThreadRow, ChatMessageRow } from '@/types/database';

// ============================================================================
// Type Converters (Database -> Store types)
// ============================================================================

function convertThreadRowToThread(row: ChatThreadRow): Thread {
  return {
    id: row.id,
    title: row.title || 'Untitled',
    agentId: row.agent_id || 'default',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at).getTime() : undefined,
    archived: row.archived || false,
    pinned: row.pinned || false,
    folder: row.folder || undefined,
    tags: row.tags || undefined,
    messageCount: row.message_count || 0,
    metadata: {
      toolsEnabled: row.tools_enabled || false,
      enabledTools: row.enabled_tools || [],
      model: row.model || undefined,
      agentStyle: row.agent_style || undefined,
      projectContext: row.project_context || undefined,
      ...((row.metadata as Record<string, unknown>) || {}),
    },
  };
}

function convertMessageRowToMessage(row: ChatMessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
    metadata: (row.metadata as Message['metadata']) || {},
  };
}

// ============================================================================
// Query Keys
// ============================================================================

export const unifiedChatKeys = {
  all: ['unified-chat'] as const,
  threads: () => [...unifiedChatKeys.all, 'threads'] as const,
  thread: (threadId: string) => [...unifiedChatKeys.all, 'thread', threadId] as const,
  messages: (threadId: string) => [...unifiedChatKeys.thread(threadId), 'messages'] as const,
  agents: () => [...unifiedChatKeys.all, 'agents'] as const,
};

// ============================================================================
// Thread Queries
// ============================================================================

/**
 * Fetch all threads and sync with store
 */
export function useThreads(options?: Omit<UseQueryOptions<Thread[]>, 'queryKey' | 'queryFn'>) {
  const setThreads = useUnifiedChatStore((state) => {
    // Return a function that updates threads in store
    return (threads: Thread[]) => {
      state.threads.forEach((existingThread) => {
        const found = threads.find((t) => t.id === existingThread.id);
        if (!found) {
          // Thread deleted on server, remove from store
          state.deleteThread(existingThread.id);
        }
      });

      threads.forEach((thread) => {
        const existing = state.threads.find((t) => t.id === thread.id);
        if (existing) {
          // Update existing thread
          state.updateThread(thread.id, thread);
        } else {
          // New thread from server (e.g., created on another device)
          state.threads.push(thread);
        }
      });
    };
  });

  return useQuery({
    queryKey: unifiedChatKeys.threads(),
    queryFn: async () => {
      const res = await fetch('/api/chat/threads');
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch threads');
      }

      const threads: Thread[] = (json.threads as ChatThreadRow[]).map(convertThreadRowToThread);

      // Sync with store
      setThreads(threads);

      return threads;
    },
    staleTime: 30_000, // 30 seconds
    ...options,
  });
}

/**
 * Fetch a single thread by ID
 */
export function useThread(threadId: string | null) {
  return useQuery({
    queryKey: threadId ? unifiedChatKeys.thread(threadId) : [],
    queryFn: async () => {
      if (!threadId) return null;

      const res = await fetch(`/api/chat/threads/${threadId}`);
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch thread');
      }

      return convertThreadRowToThread(json.thread as ChatThreadRow);
    },
    enabled: !!threadId,
    staleTime: 30_000,
  });
}

/**
 * Create a new thread
 */
export function useCreateThread() {
  const queryClient = useQueryClient();
  const store = useUnifiedChatStore();

  return useMutation({
    mutationFn: async (data: {
      title?: string;
      agentId?: string;
      model?: string;
      enabledTools?: string[];
      agentStyle?: string;
      folder?: string;
      tags?: string[];
    }) => {
      const res = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to create thread');
      }

      return convertThreadRowToThread(json.thread as ChatThreadRow);
    },
    onMutate: async (variables) => {
      // Optimistic update: Create thread in store immediately
      const tempId = store.createThread(
        variables.title || 'New Chat',
        variables.agentId || 'default'
      );

      // Return context for rollback if needed
      return { tempId };
    },
    onSuccess: (thread, _, context) => {
      // Replace temporary thread with real thread from server
      if (context?.tempId) {
        store.deleteThread(context.tempId);
      }

      // Add real thread to store
      store.threads.unshift(thread);
      store.setActiveThread(thread.id);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.threads() });
    },
    onError: (_, __, context) => {
      // Rollback optimistic update
      if (context?.tempId) {
        store.deleteThread(context.tempId);
      }
    },
  });
}

/**
 * Update thread (title, tags, folder, etc.)
 */
export function useUpdateThread() {
  const queryClient = useQueryClient();
  const updateThread = useUnifiedChatStore((state) => state.updateThread);

  return useMutation({
    mutationFn: async ({
      threadId,
      updates,
    }: {
      threadId: string;
      updates: {
        title?: string;
        tags?: string[];
        folder?: string;
        archived?: boolean;
        pinned?: boolean;
      };
    }) => {
      const res = await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to update thread');
      }

      return convertThreadRowToThread(json.thread as ChatThreadRow);
    },
    onMutate: async ({ threadId, updates }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: unifiedChatKeys.thread(threadId) });

      // Snapshot previous value
      const previousThread = queryClient.getQueryData<Thread>(unifiedChatKeys.thread(threadId));

      // Optimistic update
      updateThread(threadId, updates);

      return { previousThread };
    },
    onError: (_, { threadId }, context) => {
      // Rollback on error
      if (context?.previousThread) {
        updateThread(threadId, context.previousThread);
      }
    },
    onSettled: (_, __, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.thread(threadId) });
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.threads() });
    },
  });
}

/**
 * Delete a thread
 */
export function useDeleteThread() {
  const queryClient = useQueryClient();
  const deleteThread = useUnifiedChatStore((state) => state.deleteThread);

  return useMutation({
    mutationFn: async (threadId: string) => {
      const res = await fetch(`/api/chat/threads/${threadId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to delete thread');
      }

      return threadId;
    },
    onMutate: async (threadId) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: unifiedChatKeys.thread(threadId) });

      // Snapshot for rollback
      const previousThreads = queryClient.getQueryData<Thread[]>(unifiedChatKeys.threads());
      const previousMessages = queryClient.getQueryData<Message[]>(
        unifiedChatKeys.messages(threadId)
      );

      // Optimistic delete
      deleteThread(threadId);

      return { previousThreads, previousMessages };
    },
    onError: (_, threadId, context) => {
      // Rollback: Re-add thread and messages
      if (context?.previousThreads) {
        const deletedThread = context.previousThreads.find((t) => t.id === threadId);
        if (deletedThread) {
          useUnifiedChatStore.setState((state) => ({
            threads: [...state.threads, deletedThread],
          }));
        }
      }
    },
    onSuccess: (threadId) => {
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.threads() });
      queryClient.removeQueries({ queryKey: unifiedChatKeys.thread(threadId) });
      queryClient.removeQueries({ queryKey: unifiedChatKeys.messages(threadId) });
    },
  });
}

// ============================================================================
// Message Queries
// ============================================================================

/**
 * Fetch messages for a thread
 */
export function useMessages(
  threadId: string | null,
  options: {
    limit?: number;
    offset?: number;
    since?: string;
    enabled?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, since, enabled = true } = options;

  return useQuery({
    queryKey: threadId ? [...unifiedChatKeys.messages(threadId), { limit, offset, since }] : [],
    queryFn: async () => {
      if (!threadId) return [];

      const params = new URLSearchParams({
        thread_id: threadId,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (since) {
        params.append('since', since);
      }

      const res = await fetch(`/api/chat/messages?${params}`);
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch messages');
      }

      const messages: Message[] = (json.messages as ChatMessageRow[]).map(
        convertMessageRowToMessage
      );

      // Sync with store
      if (threadId) {
        useUnifiedChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [threadId]: messages,
          },
        }));
      }

      return messages;
    },
    enabled: enabled && !!threadId,
    staleTime: 10_000, // 10 seconds
  });
}

/**
 * Send a message (user or assistant)
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const addMessage = useUnifiedChatStore((state) => state.addMessage);

  return useMutation({
    mutationFn: async (data: {
      thread_id: string;
      content: string;
      role?: 'user' | 'assistant' | 'system';
      file_urls?: string[];
      model?: string;
      source?: 'text' | 'voice';
    }) => {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to send message');
      }

      return convertMessageRowToMessage(json.message as ChatMessageRow);
    },
    onMutate: async (variables) => {
      // Optimistic update: Add message to store immediately
      const messageId = addMessage({
        threadId: variables.thread_id,
        role: variables.role || 'user',
        content: variables.content,
        fileUrls: variables.file_urls,
        source: variables.source,
      });

      return { messageId };
    },
    onSuccess: (message, variables) => {
      // Update store with server-confirmed message
      useUnifiedChatStore.getState().updateMessage(variables.thread_id, message.id, message);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.messages(variables.thread_id) });
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.threads() });
    },
    onError: (_, variables, context) => {
      // Rollback: Remove optimistic message
      if (context?.messageId) {
        useUnifiedChatStore.getState().deleteMessage(variables.thread_id, context.messageId);
      }
    },
  });
}

/**
 * Delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const deleteMessage = useUnifiedChatStore((state) => state.deleteMessage);

  return useMutation({
    mutationFn: async ({ threadId, messageId }: { threadId: string; messageId: string }) => {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to delete message');
      }

      return { threadId, messageId };
    },
    onMutate: async ({ threadId, messageId }) => {
      // Optimistic delete
      const previousMessages = useUnifiedChatStore.getState().messages[threadId];
      deleteMessage(threadId, messageId);

      return { previousMessages };
    },
    onError: (_, { threadId }, context) => {
      // Rollback
      if (context?.previousMessages) {
        useUnifiedChatStore.setState({
          messages: {
            ...useUnifiedChatStore.getState().messages,
            [threadId]: context.previousMessages,
          },
        });
      }
    },
    onSuccess: ({ threadId }) => {
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.messages(threadId) });
    },
  });
}

// ============================================================================
// Agent Queries
// ============================================================================

/**
 * Fetch available agents
 */
export function useAgents() {
  const setAvailableAgents = useUnifiedChatStore((state) => state.setAvailableAgents);

  return useQuery({
    queryKey: unifiedChatKeys.agents(),
    queryFn: async () => {
      const res = await fetch('/api/agents');
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch agents');
      }

      const agents = json.agents;

      // Sync with store
      setAvailableAgents(agents);

      return agents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (agents don't change often)
  });
}

/**
 * Create a new message in a thread
 */
export function useCreateMessage() {
  const queryClient = useQueryClient();
  const store = useUnifiedChatStore();

  return useMutation({
    mutationFn: async (data: {
      threadId: string;
      message: Omit<Message, 'id' | 'threadId'>;
    }) => {
      // This is client-side only, no API call needed
      // Messages are created via /api/chat/messages/send route
      return data.message;
    },
    onSuccess: (message, variables) => {
      // Add message to store
      store.addMessage({
        threadId: variables.threadId,
        ...message,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: unifiedChatKeys.messages(variables.threadId) });
    },
  });
}
