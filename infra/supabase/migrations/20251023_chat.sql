-- Chat schema for threads and messages
-- This migration is safe to re-run.

create table if not exists public.chat_threads (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null default 'New chat',
  agent_id text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id text primary key,
  user_id uuid not null default auth.uid(),
  thread_id text not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages(thread_id, created_at);

-- RLS
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- Owner-only policies (adjust to your auth model)
drop policy if exists chat_threads_own_read on public.chat_threads;
create policy chat_threads_own_read on public.chat_threads
  for select using (user_id = auth.uid());
drop policy if exists chat_threads_own_write on public.chat_threads;
create policy chat_threads_own_write on public.chat_threads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists chat_messages_own_read on public.chat_messages;
create policy chat_messages_own_read on public.chat_messages
  for select using (user_id = auth.uid());
drop policy if exists chat_messages_own_write on public.chat_messages;
create policy chat_messages_own_write on public.chat_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Dev-open policies (allow anon role full access). Remove for production.
drop policy if exists chat_threads_dev_open on public.chat_threads;
create policy chat_threads_dev_open on public.chat_threads
  for all using (auth.role() = 'anon') with check (auth.role() = 'anon');

drop policy if exists chat_messages_dev_open on public.chat_messages;
create policy chat_messages_dev_open on public.chat_messages
  for all using (auth.role() = 'anon') with check (auth.role() = 'anon');

-- Updated at trigger
create or replace function public.set_updated_at_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists set_chat_threads_updated_at on public.chat_threads;
create trigger set_chat_threads_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at_timestamp();

-- Realtime publication (required for postgres_changes)
-- Safe if tables already exist in publication
alter publication supabase_realtime add table public.chat_threads;
alter publication supabase_realtime add table public.chat_messages;
