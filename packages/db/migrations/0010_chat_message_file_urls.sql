-- 0010_chat_message_file_urls.sql
-- Add file_urls column to chat_messages table for multimodal attachments

DO $$
BEGIN
  -- Add file_urls column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='chat_messages' AND column_name='file_urls'
  ) THEN
    ALTER TABLE public.chat_messages
    ADD COLUMN file_urls text[] DEFAULT ARRAY[]::text[];

    RAISE NOTICE 'Added file_urls column to chat_messages table';
  ELSE
    RAISE NOTICE 'File_urls column already exists in chat_messages table';
  END IF;
END $$;

-- Create index for querying messages with attachments
CREATE INDEX IF NOT EXISTS chat_messages_file_urls_idx ON public.chat_messages USING GIN(file_urls);

-- Create Supabase Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false, -- Not public, requires authentication
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for chat-attachments bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
