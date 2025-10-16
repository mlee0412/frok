-- 0001_baseline.sql
-- Schema for FROK core entities with basic RLS and anon read policies

-- Enable required extensions (usually available by default on Supabase)
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- USERS (app-level profiles separate from auth.users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  role text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Allow read for anon (public dashboard lists). Adjust later for privacy.
drop policy if exists users_select_anon on public.users;
create policy users_select_anon on public.users
  for select
  to anon
  using (true);

-- DEVICES
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  area text,
  online boolean,
  owner_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists devices_owner_idx on public.devices(owner_id);

alter table public.devices enable row level security;

drop policy if exists devices_select_anon on public.devices;
create policy devices_select_anon on public.devices
  for select
  to anon
  using (true);

-- TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'todo',
  priority text not null default 'normal',
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists tasks_select_anon on public.tasks;
create policy tasks_select_anon on public.tasks
  for select
  to anon
  using (true);

-- AUTOMATIONS
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.automations enable row level security;

drop policy if exists automations_select_anon on public.automations;
create policy automations_select_anon on public.automations
  for select
  to anon
  using (true);

-- TRANSACTIONS (finance)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  kind text not null default 'expense',
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

drop policy if exists transactions_select_anon on public.transactions;
create policy transactions_select_anon on public.transactions
  for select
  to anon
  using (true);
