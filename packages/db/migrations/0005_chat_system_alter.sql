-- 0005_chat_system_alter.sql
-- Alter existing chat tables to ensure all required columns exist

-- Add missing columns to chat_threads (only if they don't exist)
DO $$ 
BEGIN
  -- Add enabled_tools if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_threads' AND column_name='enabled_tools'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN enabled_tools text[];
  END IF;

  -- Add model if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_threads' AND column_name='model'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN model text DEFAULT 'gpt-4o';
  END IF;

  -- Add agent_style if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_threads' AND column_name='agent_style'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN agent_style text DEFAULT 'balanced';
  END IF;

  -- Add tags if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_threads' AND column_name='tags'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN tags text[];
  END IF;

  -- Add folder if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_threads' AND column_name='folder'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN folder text;
  END IF;

  -- Add pinned if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_threads' AND column_name='pinned'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN pinned boolean DEFAULT false;
  END IF;

  -- Add archived if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_threads' AND column_name='archived'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN archived boolean DEFAULT false;
  END IF;
END $$;

-- Add missing columns to chat_messages (only if they don't exist)
DO $$ 
BEGIN
  -- Add metadata if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_messages' AND column_name='metadata'
  ) THEN
    ALTER TABLE public.chat_messages ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_messages' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.chat_messages ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace trigger for updating thread timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE public.chat_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_update_thread_trigger ON public.chat_messages;
CREATE TRIGGER chat_messages_update_thread_trigger
  AFTER INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();

-- Create agent_memories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL DEFAULT 'FROK Assistant',
  memory_type text NOT NULL CHECK (memory_type IN ('core', 'user_preference', 'context', 'fact')),
  content text NOT NULL,
  importance int NOT NULL DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS chat_threads_user_id_idx ON public.chat_threads(user_id);
CREATE INDEX IF NOT EXISTS chat_threads_updated_at_idx ON public.chat_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_threads_deleted_at_idx ON public.chat_threads(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx ON public.chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);

CREATE INDEX IF NOT EXISTS agent_memories_agent_name_idx ON public.agent_memories(agent_name);
CREATE INDEX IF NOT EXISTS agent_memories_memory_type_idx ON public.agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS agent_memories_importance_idx ON public.agent_memories(importance DESC);

-- Ensure RLS is enabled
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent_memories if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='agent_memories' AND policyname='agent_memories_select_anon'
  ) THEN
    CREATE POLICY agent_memories_select_anon ON public.agent_memories FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='agent_memories' AND policyname='agent_memories_insert_anon'
  ) THEN
    CREATE POLICY agent_memories_insert_anon ON public.agent_memories FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='agent_memories' AND policyname='agent_memories_update_anon'
  ) THEN
    CREATE POLICY agent_memories_update_anon ON public.agent_memories FOR UPDATE TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='agent_memories' AND policyname='agent_memories_delete_anon'
  ) THEN
    CREATE POLICY agent_memories_delete_anon ON public.agent_memories FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Chat system schema updated successfully!';
  RAISE NOTICE 'All required columns and indexes are now in place.';
END $$;
