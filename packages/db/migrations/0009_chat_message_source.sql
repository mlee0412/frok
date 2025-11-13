-- 0009_chat_message_source.sql
-- Add source column to chat_messages table to distinguish text vs voice messages

DO $$
BEGIN
  -- Add source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='chat_messages' AND column_name='source'
  ) THEN
    ALTER TABLE public.chat_messages
    ADD COLUMN source text CHECK (source IN ('text', 'voice')) DEFAULT 'text';

    RAISE NOTICE 'Added source column to chat_messages table';
  ELSE
    RAISE NOTICE 'Source column already exists in chat_messages table';
  END IF;
END $$;

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS chat_messages_source_idx ON public.chat_messages(source);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Chat message source tracking enabled!';
  RAISE NOTICE 'Messages can now be marked as text or voice origin.';
END $$;
