// Type definitions aligned with Supabase schema
// Matches chat_threads and chat_messages tables

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  created_at?: string;
  files?: { name: string; url: string; type?: string }[];
  images?: { url: string; name: string }[];
  toolsUsed?: string[];
  executionTime?: number;
};

export type Thread = {
  id: string;
  title: string;
  agentId?: string;
  userId?: string;
  createdAt?: number;
  updatedAt?: number;
  created_at?: string;
  updated_at?: string;
  
  // Organization
  pinned?: boolean;
  archived?: boolean;
  deleted_at?: string | null;
  tags?: string[];
  folder?: string | null;
  
  // Configuration
  toolsEnabled?: boolean; // Legacy, kept for backwards compatibility
  enabledTools?: string[]; // New: ['home_assistant', 'memory', 'web_search', 'tavily_search', 'image_generation']
  model?: string; // 'gpt-5' or 'gpt-5-nano'
  agentStyle?: string; // 'balanced', 'concise', 'detailed', 'technical', 'casual'
  
  // Context
  projectContext?: string; // Detailed project context for agent
  agentName?: string; // Agent name for memory isolation
  
  // Client-side only
  messages?: Message[];
  branchedFrom?: string;
};

export type ThreadUpdate = {
  title?: string;
  agentId?: string;
  pinned?: boolean;
  archived?: boolean;
  deleted_at?: string | null;
  tags?: string[];
  folder?: string | null;
  toolsEnabled?: boolean;
  enabledTools?: string[];
  model?: string;
  agentStyle?: string;
  projectContext?: string;
  agentName?: string;
};

export type AgentMemory = {
  id: string;
  agent_name: string;
  memory_type: 'core' | 'user_preference' | 'fact' | 'skill';
  content: string;
  importance: number; // 1-10
  created_at: string;
  updated_at: string;
  access_count: number;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
};

export type SharedThread = {
  id: string;
  thread_id: string;
  share_token: string;
  created_at: string;
  expires_at?: string;
  view_count: number;
};
