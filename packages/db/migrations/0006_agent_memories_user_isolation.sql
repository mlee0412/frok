-- 0006_agent_memories_user_isolation.sql
-- Fix agent_memories table to support user isolation with proper RLS policies

-- Step 1: Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='agent_memories' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.agent_memories ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column to agent_memories table';
  END IF;
END $$;

-- Step 2: Create index for user_id lookups
CREATE INDEX IF NOT EXISTS agent_memories_user_id_idx ON public.agent_memories(user_id);

-- Step 3: Drop old anon policies (they allowed access without authentication)
DROP POLICY IF EXISTS agent_memories_select_anon ON public.agent_memories;
DROP POLICY IF EXISTS agent_memories_insert_anon ON public.agent_memories;
DROP POLICY IF EXISTS agent_memories_update_anon ON public.agent_memories;
DROP POLICY IF EXISTS agent_memories_delete_anon ON public.agent_memories;

-- Step 4: Create proper RLS policies for authenticated users
-- SELECT: Users can only read their own memories
CREATE POLICY agent_memories_select_authenticated
  ON public.agent_memories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert their own memories
CREATE POLICY agent_memories_insert_authenticated
  ON public.agent_memories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own memories
CREATE POLICY agent_memories_update_authenticated
  ON public.agent_memories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own memories
CREATE POLICY agent_memories_delete_authenticated
  ON public.agent_memories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 5: Verify RLS is enabled (should already be from previous migration)
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Agent memories user isolation fixed!';
  RAISE NOTICE '   - user_id column added';
  RAISE NOTICE '   - RLS policies updated for authenticated users';
  RAISE NOTICE '   - Old anon policies removed';
END $$;
