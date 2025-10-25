-- Add metadata columns to chat_threads for thread operations
alter table if exists public.chat_threads
  add column if not exists pinned boolean not null default false,
  add column if not exists archived boolean not null default false,
  add column if not exists deleted_at timestamptz;

-- Helpful indexes
create index if not exists chat_threads_pinned_updated_idx
  on public.chat_threads(pinned desc, updated_at desc);
