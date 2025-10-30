import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
type Memory = {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
};

type AgentMemory = {
  id: string;
  memory_type: string;
  content: string;
  importance: number;
  created_at: string;
};

// Query Keys
export const memoriesKeys = {
  all: ['memories'] as const,
  user: () => [...memoriesKeys.all, 'user'] as const,
  userByTag: (tag: string | null) => [...memoriesKeys.user(), tag] as const,
  agent: (agentName: string) => [...memoriesKeys.all, 'agent', agentName] as const,
};

// User Memories
export function useUserMemories(tag: string | null = null) {
  return useQuery({
    queryKey: memoriesKeys.userByTag(tag),
    queryFn: async () => {
      const url = tag
        ? `/api/memory/list?tag=${encodeURIComponent(tag)}&limit=100`
        : `/api/memory/list?limit=100`;

      const res = await fetch(url);
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch memories');
      }

      return json.memories as Memory[];
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useDeleteUserMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await fetch(`/api/memory/list?id=${memoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to delete memory');
      }

      return memoryId;
    },
    onSuccess: () => {
      // Invalidate all user memory queries
      queryClient.invalidateQueries({ queryKey: memoriesKeys.user() });
    },
  });
}

// Agent Memories
export function useAgentMemories(agentName: string) {
  return useQuery({
    queryKey: memoriesKeys.agent(agentName),
    queryFn: async () => {
      const res = await fetch(`/api/agent/memory?agent_name=${encodeURIComponent(agentName)}&limit=20`);
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch agent memories');
      }

      return json.memories as AgentMemory[];
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useAddAgentMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentName,
      memoryType,
      content,
      importance,
    }: {
      agentName: string;
      memoryType: string;
      content: string;
      importance: number;
    }) => {
      const res = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName,
          memory_type: memoryType,
          content,
          importance,
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to add memory');
      }

      return json.memory as AgentMemory;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific agent's memories
      queryClient.invalidateQueries({ queryKey: memoriesKeys.agent(variables.agentName) });
    },
  });
}

export function useDeleteAgentMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memoryId, agentName }: { memoryId: string; agentName: string }) => {
      const res = await fetch(`/api/agent/memory?id=${memoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || 'Failed to delete memory');
      }

      return { memoryId, agentName };
    },
    onSuccess: (data) => {
      // Invalidate the specific agent's memories
      queryClient.invalidateQueries({ queryKey: memoriesKeys.agent(data.agentName) });
    },
  });
}
