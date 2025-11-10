-- ============================================================================
-- Voice Assistant Database Migration
-- Created: 2025-11-10
-- Purpose: Add tables for voice conversation history and messages
-- ============================================================================

-- Voice Conversations Table
-- Stores metadata about voice conversation sessions
CREATE TABLE IF NOT EXISTS voice_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voice Messages Table
-- Stores individual messages within voice conversations
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES voice_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  audio_url TEXT, -- Optional: S3/Supabase storage URL for audio recording
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_voice_conversations_user_id
  ON voice_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_voice_conversations_started_at
  ON voice_conversations(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_messages_conversation_id
  ON voice_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_voice_messages_timestamp
  ON voice_messages(timestamp DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- Voice Conversations Policies
-- Users can only view their own conversations
CREATE POLICY "Users can view own conversations"
  ON voice_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own conversations
CREATE POLICY "Users can insert own conversations"
  ON voice_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own conversations
CREATE POLICY "Users can update own conversations"
  ON voice_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own conversations
CREATE POLICY "Users can delete own conversations"
  ON voice_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Voice Messages Policies
-- Users can only view messages from their own conversations
CREATE POLICY "Users can view own messages"
  ON voice_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Users can only insert messages into their own conversations
CREATE POLICY "Users can insert own messages"
  ON voice_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM voice_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Users can only update messages from their own conversations
CREATE POLICY "Users can update own messages"
  ON voice_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM voice_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM voice_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Users can only delete messages from their own conversations
CREATE POLICY "Users can delete own messages"
  ON voice_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM voice_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- Triggers for Automatic Timestamp Updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for voice_conversations
CREATE TRIGGER trigger_update_voice_conversation_timestamp
  BEFORE UPDATE ON voice_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_conversation_updated_at();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to automatically update message_count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE voice_conversations
    SET message_count = message_count + 1
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE voice_conversations
    SET message_count = message_count - 1
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update message_count
CREATE TRIGGER trigger_update_message_count
  AFTER INSERT OR DELETE ON voice_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_message_count();

-- ============================================================================
-- Sample Queries for Testing
-- ============================================================================

-- Get user's recent conversations
-- SELECT * FROM voice_conversations
-- WHERE user_id = auth.uid()
-- ORDER BY started_at DESC
-- LIMIT 10;

-- Get all messages for a conversation
-- SELECT * FROM voice_messages
-- WHERE conversation_id = 'conversation-uuid'
-- ORDER BY timestamp ASC;

-- Get conversation with message count
-- SELECT
--   vc.*,
--   COUNT(vm.id) as actual_message_count
-- FROM voice_conversations vc
-- LEFT JOIN voice_messages vm ON vc.id = vm.conversation_id
-- WHERE vc.user_id = auth.uid()
-- GROUP BY vc.id
-- ORDER BY vc.started_at DESC;
