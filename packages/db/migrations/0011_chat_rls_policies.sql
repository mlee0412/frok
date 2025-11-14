-- Migration: Add missing RLS policies for chat_threads and chat_messages
-- Date: 2025-11-14
-- Issue: RLS was enabled but no policies were created, blocking all access

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS chat_threads_own_read ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_own_write ON public.chat_threads;
DROP POLICY IF EXISTS chat_messages_own_read ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_own_write ON public.chat_messages;
DROP POLICY IF EXISTS chat_threads_dev_open ON public.chat_threads;
DROP POLICY IF EXISTS chat_messages_dev_open ON public.chat_messages;

-- Owner-only policies for authenticated users
-- Users can only read and write their own threads
CREATE POLICY chat_threads_own_read ON public.chat_threads
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY chat_threads_own_write ON public.chat_threads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only read and write their own messages
CREATE POLICY chat_messages_own_read ON public.chat_messages
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY chat_messages_own_write ON public.chat_messages
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Dev-friendly policies for anon role (can be removed in production)
-- Allow anon users full access for development/testing
CREATE POLICY chat_threads_dev_open ON public.chat_threads
  FOR ALL
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY chat_messages_dev_open ON public.chat_messages
  FOR ALL
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

-- Verify RLS is still enabled
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for chat_threads and chat_messages created successfully!';
  RAISE NOTICE 'Authenticated users can now access their own threads and messages.';
  RAISE NOTICE 'Anon users have full access for development (remove chat_*_dev_open policies in production).';
END $$;
