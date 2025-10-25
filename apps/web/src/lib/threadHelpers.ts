// Helper utilities for thread management and UI/UX
import type { Thread, ThreadUpdate } from './types/chat';

/**
 * Default tool configuration
 */
export const DEFAULT_ENABLED_TOOLS = [
  'home_assistant',
  'memory',
  'web_search',
  'tavily_search',
  'image_generation',
] as const;

export type ToolName = typeof DEFAULT_ENABLED_TOOLS[number];

/**
 * Tool metadata for UI display
 */
export const TOOL_METADATA: Record<string, { name: string; icon: string; description: string }> = {
  home_assistant: {
    name: 'Home Assistant',
    icon: '🏠',
    description: 'Control smart home devices',
  },
  memory: {
    name: 'Persistent Memory',
    icon: '🧠',
    description: 'Remember user preferences',
  },
  web_search: {
    name: 'Web Search (DuckDuckGo)',
    icon: '🔍',
    description: 'Search the web for information',
  },
  tavily_search: {
    name: 'Web Search (Tavily)',
    icon: '🌐',
    description: 'Enhanced web search',
  },
  image_generation: {
    name: 'Image Generation',
    icon: '🎨',
    description: 'Create images with AI',
  },
};

/**
 * Agent style options
 */
export const AGENT_STYLES = [
  { id: 'balanced', name: 'Balanced', description: 'Friendly and professional' },
  { id: 'concise', name: 'Concise', description: 'Brief and to the point' },
  { id: 'detailed', name: 'Detailed', description: 'Thorough explanations' },
  { id: 'technical', name: 'Technical', description: 'Expert and precise' },
  { id: 'casual', name: 'Casual', description: 'Relaxed and conversational' },
] as const;

export type AgentStyle = typeof AGENT_STYLES[number]['id'];

/**
 * Model options
 */
export const MODEL_OPTIONS = [
  { id: 'gpt-5', name: 'GPT-5', description: 'Most capable, slower' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Faster, more efficient' },
] as const;

export type ModelId = typeof MODEL_OPTIONS[number]['id'];

/**
 * Create a new thread with default values
 */
export function createDefaultThread(overrides?: Partial<Thread>): Thread {
  return {
    id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: 'New Chat',
    agentId: 'default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: false,
    archived: false,
    deleted_at: undefined,
    tags: [],
    folder: undefined,
    toolsEnabled: true,
    enabledTools: [...DEFAULT_ENABLED_TOOLS],
    model: 'gpt-5',
    agentStyle: 'balanced',
    projectContext: undefined,
    agentName: 'FROK Assistant',
    messages: [],
    ...overrides,
  };
}

/**
 * Filter threads based on criteria
 */
export function filterThreads(
  threads: Thread[],
  options: {
    searchQuery?: string;
    folder?: string | null;
    tags?: string[];
    showArchived?: boolean;
  }
): Thread[] {
  let filtered = threads;

  // Filter deleted
  filtered = filtered.filter((t) => !t.deleted_at);

  // Filter archived
  if (!options.showArchived) {
    filtered = filtered.filter((t) => !t.archived);
  }

  // Filter by folder
  if (options.folder !== undefined) {
    if (options.folder === null) {
      filtered = filtered.filter((t) => !t.folder);
    } else {
      filtered = filtered.filter((t) => t.folder === options.folder);
    }
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter((t) =>
      options.tags!.every((tag) => t.tags?.includes(tag))
    );
  }

  // Filter by search query
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = filtered.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(query);
      const messagesMatch = t.messages?.some((m) =>
        m.content.toLowerCase().includes(query)
      );
      return titleMatch || messagesMatch;
    });
  }

  return filtered;
}

/**
 * Sort threads with pinned first
 */
export function sortThreads(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => {
    // Pinned first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // Then by updated_at
    const aTime = a.updatedAt || 0;
    const bTime = b.updatedAt || 0;
    return bTime - aTime;
  });
}

/**
 * Get unique folders from threads
 */
export function getUniqueFolders(threads: Thread[]): string[] {
  const folders = new Set<string>();
  threads.forEach((t) => {
    if (t.folder) folders.add(t.folder);
  });
  return Array.from(folders).sort();
}

/**
 * Get unique tags from threads
 */
export function getUniqueTags(threads: Thread[]): string[] {
  const tags = new Set<string>();
  threads.forEach((t) => {
    t.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

/**
 * Validate thread data before saving
 */
export function validateThread(thread: Partial<Thread>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (thread.title && thread.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  if (thread.enabledTools && thread.enabledTools.length === 0) {
    errors.push('At least one tool must be enabled');
  }

  if (thread.model && !['gpt-5', 'gpt-5-nano'].includes(thread.model)) {
    errors.push('Invalid model selection');
  }

  if (thread.agentStyle && !AGENT_STYLES.find((s) => s.id === thread.agentStyle)) {
    errors.push('Invalid agent style');
  }

  if (thread.projectContext && thread.projectContext.length > 5000) {
    errors.push('Project context must be less than 5000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Prepare thread update for API
 */
export function prepareThreadUpdate(thread: Thread, updates: Partial<Thread>): ThreadUpdate {
  const threadUpdate: ThreadUpdate = {};

  if (updates.title !== undefined && updates.title !== thread.title) {
    threadUpdate.title = updates.title;
  }

  if (updates.agentId !== undefined && updates.agentId !== thread.agentId) {
    threadUpdate.agentId = updates.agentId;
  }

  if (updates.pinned !== undefined && updates.pinned !== thread.pinned) {
    threadUpdate.pinned = updates.pinned;
  }

  if (updates.archived !== undefined && updates.archived !== thread.archived) {
    threadUpdate.archived = updates.archived;
  }

  if (updates.tags !== undefined && JSON.stringify(updates.tags) !== JSON.stringify(thread.tags)) {
    threadUpdate.tags = updates.tags;
  }

  if (updates.folder !== undefined && updates.folder !== thread.folder) {
    threadUpdate.folder = updates.folder;
  }

  if (updates.enabledTools !== undefined && JSON.stringify(updates.enabledTools) !== JSON.stringify(thread.enabledTools)) {
    threadUpdate.enabledTools = updates.enabledTools;
  }

  if (updates.model !== undefined && updates.model !== thread.model) {
    threadUpdate.model = updates.model;
  }

  if (updates.agentStyle !== undefined && updates.agentStyle !== thread.agentStyle) {
    threadUpdate.agentStyle = updates.agentStyle;
  }

  if (updates.projectContext !== undefined && updates.projectContext !== thread.projectContext) {
    threadUpdate.projectContext = updates.projectContext;
  }

  if (updates.agentName !== undefined && updates.agentName !== thread.agentName) {
    threadUpdate.agentName = updates.agentName;
  }

  return threadUpdate;
}

/**
 * Check if thread has unsaved changes
 */
export function hasUnsavedChanges(original: Thread, current: Thread): boolean {
  const update = prepareThreadUpdate(original, current);
  return Object.keys(update).length > 0;
}

/**
 * Get thread statistics
 */
export function getThreadStats(thread: Thread): {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  lastMessageAt: number | null;
  hasImages: boolean;
  hasFiles: boolean;
} {
  const messages = thread.messages || [];
  
  return {
    messageCount: messages.length,
    userMessageCount: messages.filter((m) => m.role === 'user').length,
    assistantMessageCount: messages.filter((m) => m.role === 'assistant').length,
    lastMessageAt: messages.length > 0 ? messages[messages.length - 1].timestamp || null : null,
    hasImages: messages.some((m) => m.images && m.images.length > 0),
    hasFiles: messages.some((m) => m.files && m.files.length > 0),
  };
}
