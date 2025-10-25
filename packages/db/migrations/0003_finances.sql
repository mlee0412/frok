-- Finances schema
create extension if not exists pgcrypto;

create table if not exists fin_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fin_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fin_rules (
  id uuid primary key default gen_random_uuid(),
  pattern text not null,
  category_id uuid references fin_categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists fin_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references fin_accounts(id) on delete cascade,
  posted_at timestamptz not null,
  amount numeric(14, 2) not null,
  currency text not null default 'USD',
  description text,
  category_id uuid references fin_categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fin_transactions_account on fin_transactions(account_id);
create index if not exists idx_fin_transactions_posted_at on fin_transactions(posted_at desc);
create index if not exists idx_fin_transactions_category on fin_transactions(category_id);

create table if not exists fin_balances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references fin_accounts(id) on delete cascade,
  as_of_date date not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  unique (account_id, as_of_date)
);
