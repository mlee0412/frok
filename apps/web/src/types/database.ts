// Database row types for Supabase tables

export type ChatThreadRow = {
  id: string;
  user_id: string;
  title: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  message_count?: number;
  metadata?: Record<string, unknown> | null;
  pinned?: boolean;
  archived?: boolean;
  deleted_at?: string | null;
  tools_enabled?: boolean;
  tags?: string[];
  folder?: string | null;
  enabled_tools?: string[];
  model?: string;
  agent_style?: string;
  project_context?: string | null;
  agent_name?: string;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type MemoryRow = {
  id: string;
  user_id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  account: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// Home Assistant types
export type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
};

export type HAArea = {
  area_id: string;
  name: string;
  picture: string | null;
};

export type HAService = {
  domain: string;
  service: string;
  description?: string;
  fields?: Record<string, unknown>;
};

// API Response types
export type APIResponse<T = unknown> = {
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
