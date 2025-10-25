-- Add per-thread tools toggle for HA guardrails
alter table if exists public.chat_threads
  add column if not exists tools_enabled boolean not null default false;

create index if not exists chat_threads_tools_enabled_idx on public.chat_threads(tools_enabled);
