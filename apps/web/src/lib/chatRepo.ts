import { supabaseClient } from './supabaseClient';
import type { Thread as ChatThread, ThreadUpdate, Message } from './types/chat';
import type { ChatThreadRow, ChatMessageRow } from '../types/database';

// Supabase Realtime types
type RealtimePayload<T> = {
  new: T;
  old: T | null;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
};

// Typed Supabase helpers to avoid 'as any' casts
type SupabaseClient = ReturnType<typeof supabaseClient>;
type SupabaseError = { message: string } | null;
type SupabaseResponse<T> = Promise<{ data: T | null; error: SupabaseError }>;
type SupabaseArrayResponse<T> = Promise<{ data: T[] | null; error: SupabaseError }>;

type SupabaseQueryBuilder<T> = {
  select: (columns?: string) => SupabaseQueryBuilder<T> & SupabaseArrayResponse<T>;
  insert: (data: Partial<T> | Partial<T>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) => SupabaseQueryBuilder<T> & SupabaseResponse<T>;
  update: (data: Partial<T>) => SupabaseQueryBuilder<T> & SupabaseResponse<T>;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  is: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder<T>;
  limit: (count: number) => SupabaseQueryBuilder<T>;
  single: () => SupabaseResponse<T>;
} & SupabaseArrayResponse<T>;

function supaTable<T>(client: SupabaseClient, table: string): SupabaseQueryBuilder<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client.from(table) as any;
}

// Legacy support
export type Msg = Message;

const DEFAULT_AGENT_ID = 'default';

function normaliseAgentId(agentId: unknown): string {
  return typeof agentId === 'string' && agentId.trim().length > 0
    ? agentId
    : DEFAULT_AGENT_ID;
}

function mapThreadRow(r: ChatThreadRow): ChatThread {
  return {
    id: r.id,
    title: r.title ?? 'Untitled',
    agentId: normaliseAgentId(r.agent_id),
    userId: r.user_id,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    created_at: r.created_at,
    updated_at: r.updated_at,
    pinned: r.pinned || false,
    archived: r.archived || false,
    deleted_at: r.deleted_at,
    tags: r.tags || [],
    folder: r.folder,
    toolsEnabled: r.tools_enabled || false,
    enabledTools:
      r.enabled_tools || ['home_assistant', 'memory', 'web_search', 'tavily_search', 'image_generation'],
    model: r.model || 'gpt-5-mini',
    agentStyle: r.agent_style || 'balanced',
    projectContext: r.project_context ?? undefined,
    agentName: r.agent_name || 'FROK Assistant',
  };
}

export async function getSession() {
  const supa = supabaseClient();
  const { data } = await supa.auth.getSession();
  return data.session ?? null;
}

async function userIdOrAnon(): Promise<string> {
  const s = await getSession().catch(() => null);
  return (s?.user?.id as string | undefined) ?? '00000000-0000-0000-0000-000000000000';
}

export async function listThreads(): Promise<ChatThread[]> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();

  const { data, error } = await supaTable<ChatThreadRow>(supa, 'chat_threads')
    .select('*')
    .eq('user_id', uid)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(100);
    
  if (error) throw error;
  
  return (data || []).map(mapThreadRow);
}

export async function getThreadMessages(threadId: string): Promise<Message[]> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();

  const { data, error } = await supaTable<ChatMessageRow>(supa, 'chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .eq('user_id', uid)
    .order('created_at', { ascending: true })
    .limit(500);
    
  if (error) throw error;
  
  return (data || []).map((r: ChatMessageRow) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    timestamp: new Date(r.created_at).getTime(),
    created_at: r.created_at,
  }));
}

export async function createThread(t: ChatThread): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();
  
  const row: Partial<ChatThreadRow> = {
    id: t.id,
    title: t.title || 'New Chat',
    agent_id: t.agentId || 'default',
    user_id: uid,
    pinned: t.pinned || false,
    archived: t.archived || false,
    deleted_at: t.deleted_at || null,
    tools_enabled: t.toolsEnabled !== undefined ? t.toolsEnabled : true,
    tags: t.tags || [],
    folder: t.folder || null,
    enabled_tools: t.enabledTools || ['home_assistant', 'memory', 'web_search', 'tavily_search', 'image_generation'],
    model: t.model || 'gpt-5-mini',
    agent_style: t.agentStyle || 'balanced',
    project_context: t.projectContext || null,
    agent_name: t.agentName || 'FROK Assistant',
  };
  
  const { error } = await supaTable<ChatThreadRow>(supa, 'chat_threads')
    .insert(row, { onConflict: 'id', ignoreDuplicates: true });
    
  if (error) throw error;
}

export async function updateThreadTitle(id: string, title: string): Promise<void> {
  const supa = supabaseClient();
  const { error } = await supaTable<ChatThreadRow>(supa, 'chat_threads').update({ title }).eq('id', id);
  if (error) throw error;
}

export async function updateThreadAgent(id: string, agentId: string): Promise<void> {
  const supa = supabaseClient();
  const { error } = await supaTable<ChatThreadRow>(supa, 'chat_threads').update({ agent_id: agentId }).eq('id', id);
  if (error) throw error;
}

export async function updateThread(id: string, updates: ThreadUpdate): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();

  const toWrite: Partial<ChatThreadRow> = {};

  // Map client fields to database columns
  if (updates.title !== undefined) toWrite.title = updates.title;
  if (updates.agentId !== undefined) toWrite.agent_id = updates.agentId;
  if (updates.pinned !== undefined) toWrite.pinned = updates.pinned;
  if (updates.archived !== undefined) toWrite.archived = updates.archived;
  if (updates.deleted_at !== undefined) toWrite.deleted_at = updates.deleted_at;
  if (updates.tags !== undefined) toWrite.tags = updates.tags;
  if (updates.folder !== undefined) toWrite.folder = updates.folder;
  if (updates.toolsEnabled !== undefined) toWrite.tools_enabled = updates.toolsEnabled;
  if (updates.enabledTools !== undefined) toWrite.enabled_tools = updates.enabledTools;
  if (updates.model !== undefined) toWrite.model = updates.model;
  if (updates.agentStyle !== undefined) toWrite.agent_style = updates.agentStyle;
  if (updates.projectContext !== undefined) toWrite.project_context = updates.projectContext;
  if (updates.agentName !== undefined) toWrite.agent_name = updates.agentName;
  
  const { error } = await supaTable<ChatThreadRow>(supa, 'chat_threads')
    .update(toWrite)
    .eq('id', id)
    .eq('user_id', uid);
    
  if (error) throw error;
}

// Legacy function for backwards compatibility
export async function updateThreadFlags(id: string, flags: { pinned?: boolean; archived?: boolean; deleted_at?: string | null; toolsEnabled?: boolean }): Promise<void> {
  return updateThread(id, flags);
}

export async function deleteThread(id: string): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();

  const { error } = await supaTable<ChatThreadRow>(supa, 'chat_threads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', uid);
    
  if (error) throw error;
}

export async function insertMessage(threadId: string, msg: Message): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();

  const { error } = await supaTable<ChatMessageRow>(supa, 'chat_messages').insert({
    id: msg.id,
    thread_id: threadId,
    role: msg.role,
    content: msg.content,
    user_id: uid,
    created_at: msg.created_at || new Date().toISOString(),
  });
  
  if (error) throw error;
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();

  const { error } = await supaTable<ChatMessageRow>(supa, 'chat_messages')
    .update({ content })
    .eq('id', id)
    .eq('user_id', uid);
    
  if (error) throw error;
}

export type ChatSubscriptions = {
  unsubscribe: () => void;
};

export function subscribe(
  onThreadUpsert: (t: ChatThread) => void,
  onMessageUpsert: (threadId: string, m: Message) => void
): ChatSubscriptions {
  const supa = supabaseClient();
  const channel = supa.channel('realtime:chat')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, (payload: RealtimePayload<ChatThreadRow>) => {
      const r = payload.new;
      if (!r) return;

      onThreadUpsert(mapThreadRow(r));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload: RealtimePayload<ChatMessageRow>) => {
      const r = payload.new;
      if (!r) return;
      
      onMessageUpsert(r.thread_id, {
        id: r.id,
        role: r.role,
        content: r.content,
        timestamp: new Date(r.created_at).getTime(),
        created_at: r.created_at,
      });
    })
    .subscribe();

  return {
    unsubscribe: () => {
      supa.removeChannel(channel);
    },
  };
}
