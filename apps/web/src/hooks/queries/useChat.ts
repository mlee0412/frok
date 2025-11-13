import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
type ChatThread = {
  id: string;
  user_id: string;
  title: string;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ChatMessage = {
  id: string;
  user_id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source?: 'text' | 'voice';
  file_urls?: string[] | null;
  created_at: string;
};

// Query Keys
export const chatKeys = {
  all: ['chat'] as const,
  threads: () => [...chatKeys.all, 'threads'] as const,
  thread: (threadId: string) => [...chatKeys.all, 'thread', threadId] as const,
  messages: (threadId: string) => [...chatKeys.thread(threadId), 'messages'] as const,
};

// Chat Threads
export function useChatThreads() {
  return useQuery({
    queryKey: chatKeys.threads(),
    queryFn: async () => {
      const res = await fetch('/api/chat/threads');
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch threads');
      }

      return json.threads as ChatThread[];
    },
    staleTime: 30_000, // 30 seconds
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

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

      return json.thread as ChatThread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.threads() });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();

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
    onSuccess: (threadId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.threads() });
      queryClient.removeQueries({ queryKey: chatKeys.thread(threadId) });
    },
  });
}

// Chat Messages
export function useChatMessages(
  threadId: string,
  options: {
    limit?: number;
    offset?: number;
    since?: string;
    enabled?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, since, enabled = true } = options;

  return useQuery({
    queryKey: [...chatKeys.messages(threadId), { limit, offset, since }],
    queryFn: async () => {
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

      return json.messages as ChatMessage[];
    },
    enabled,
    staleTime: 10_000, // 10 seconds - messages change frequently
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      thread_id: string;
      content: string;
      role?: 'user' | 'assistant' | 'system';
      source?: 'text' | 'voice';
      file_urls?: string[];
      model?: string;
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

      return json.message as ChatMessage;
    },
    onSuccess: (_, variables) => {
      // Invalidate messages for this thread
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(variables.thread_id) });
      // Also invalidate threads list to update "updated_at"
      queryClient.invalidateQueries({ queryKey: chatKeys.threads() });
    },
  });
}
