import { supabaseClient } from './supabaseClient';
import type { Thread, ThreadUpdate, Message } from './types/chat';

// Legacy support
export type Msg = Message;

export async function getSession() {
  const supa = supabaseClient();
  const { data } = await supa.auth.getSession();
  return data.session ?? null;
}

async function userIdOrAnon(): Promise<string> {
  const s = await getSession().catch(() => null);
  return (s?.user?.id as string | undefined) ?? '00000000-0000-0000-0000-000000000000';
}

export async function listThreads(): Promise<Thread[]> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();
  
  const { data, error } = await (supa.from('chat_threads' as any) as any)
    .select('*')
    .eq('user_id', uid)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(100);
    
  if (error) throw error;
  
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    agentId: r.agent_id,
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
    enabledTools: r.enabled_tools || ['home_assistant', 'memory', 'web_search', 'tavily_search', 'image_generation'],
    model: r.model || 'gpt-5',
    agentStyle: r.agent_style || 'balanced',
    projectContext: r.project_context,
    agentName: r.agent_name || 'FROK Assistant',
  }));
}

export async function getThreadMessages(threadId: string): Promise<Message[]> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();
  
  const { data, error } = await (supa.from('chat_messages' as any) as any)
    .select('*')
    .eq('thread_id', threadId)
    .eq('user_id', uid)
    .order('created_at', { ascending: true })
    .limit(500);
    
  if (error) throw error;
  
  return (data || []).map((r: any) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    timestamp: new Date(r.created_at).getTime(),
    created_at: r.created_at,
  }));
}

export async function createThread(t: Thread): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();
  
  const row: any = {
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
    model: t.model || 'gpt-5',
    agent_style: t.agentStyle || 'balanced',
    project_context: t.projectContext || null,
    agent_name: t.agentName || 'FROK Assistant',
  };
  
  const { error } = await (supa.from('chat_threads' as any) as any)
    .insert(row, { onConflict: 'id', ignoreDuplicates: true } as any);
    
  if (error) throw error;
}

export async function updateThreadTitle(id: string, title: string): Promise<void> {
  const supa = supabaseClient();
  const { error } = await (supa.from('chat_threads' as any) as any).update({ title }).eq('id', id);
  if (error) throw error;
}

export async function updateThreadAgent(id: string, agentId: string): Promise<void> {
  const supa = supabaseClient();
  const { error } = await (supa.from('chat_threads' as any) as any).update({ agent_id: agentId }).eq('id', id);
  if (error) throw error;
}

export async function updateThread(id: string, updates: ThreadUpdate): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();
  
  const toWrite: any = {};
  
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
  
  const { error } = await (supa.from('chat_threads' as any) as any)
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
  
  const { error } = await (supa.from('chat_threads' as any) as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', uid);
    
  if (error) throw error;
}

export async function insertMessage(threadId: string, msg: Message): Promise<void> {
  const supa = supabaseClient();
  const uid = await userIdOrAnon();
  
  const { error } = await (supa.from('chat_messages' as any) as any).insert({
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
  
  const { error } = await (supa.from('chat_messages' as any) as any)
    .update({ content })
    .eq('id', id)
    .eq('user_id', uid);
    
  if (error) throw error;
}

export type ChatSubscriptions = {
  unsubscribe: () => void;
};

export function subscribe(
  onThreadUpsert: (t: Thread) => void,
  onMessageUpsert: (threadId: string, m: Message) => void
): ChatSubscriptions {
  const supa = supabaseClient();
  const channel = supa.channel('realtime:chat')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, (payload) => {
      const r: any = payload.new;
      if (!r) return;
      
      onThreadUpsert({
        id: r.id,
        title: r.title,
        agentId: r.agent_id,
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
        enabledTools: r.enabled_tools || ['home_assistant', 'memory', 'web_search', 'tavily_search', 'image_generation'],
        model: r.model || 'gpt-5',
        agentStyle: r.agent_style || 'balanced',
        projectContext: r.project_context,
        agentName: r.agent_name || 'FROK Assistant',
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
      const r: any = payload.new;
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
