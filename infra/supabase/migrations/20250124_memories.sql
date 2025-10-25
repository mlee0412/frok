-- Enable pgvector extension for embedding support
create extension if not exists vector with schema extensions;

-- Persistent memories table for agent context
create table if not exists public.memories (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  content text not null,
  tags text[] default '{}',
  embedding extensions.vector(1536),
  created_at timestamp with time zone default now()
);

-- Index for user lookups
create index if not exists memories_user_id_idx on public.memories(user_id);

-- Index for tag-based filtering
create index if not exists memories_tags_idx on public.memories using gin(tags);

-- Vector similarity search index (for future semantic search)
create index if not exists memories_embedding_idx on public.memories 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Enable RLS
alter table public.memories enable row level security;

-- Policy: users can only access their own memories
create policy "Users access own memories" on public.memories
  for all using (auth.uid()::text = user_id);
