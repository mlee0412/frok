-- Migration: 0008_encrypted_sessions
-- Description: Add encrypted session storage for OpenAI Agents SDK
-- Date: 2025-11-10
-- Phase: Phase 2 - Core Enhancements (Session Encryption)
--
-- Purpose:
-- - Store encrypted conversation data for compliance (GDPR, HIPAA)
-- - Use AES-256-GCM encryption at application layer
-- - Auto-expire sessions after 30 days for data retention
--
-- Related:
-- - apps/web/src/lib/agent/sessionStorage.ts (SupabaseEncryptedStorage)
-- - Phase 2.1 of OpenAI Agents SDK Improvement Plan

-- ============================================================
-- 1. Create encrypted_sessions table
-- ============================================================

CREATE TABLE IF NOT EXISTS encrypted_sessions (
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  encrypted_data TEXT NOT NULL,
  iv VARCHAR(32) NOT NULL,          -- Initialization vector (hex-encoded, 16 bytes = 32 chars)
  auth_tag VARCHAR(32) NOT NULL,     -- Authentication tag (hex-encoded, 16 bytes = 32 chars)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

-- Index for querying sessions by user
CREATE INDEX idx_encrypted_sessions_user_id
  ON encrypted_sessions(user_id);

-- Index for cleanup queries (finding expired sessions)
CREATE INDEX idx_encrypted_sessions_updated_at
  ON encrypted_sessions(updated_at);

-- ============================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE encrypted_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own encrypted sessions
CREATE POLICY "Users can only access their own encrypted sessions"
  ON encrypted_sessions
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Service role can access all sessions (for admin operations)
CREATE POLICY "Service role can access all encrypted sessions"
  ON encrypted_sessions
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- 4. Create automatic cleanup function
-- ============================================================

-- Function to delete sessions older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_encrypted_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM encrypted_sessions
  WHERE updated_at < NOW() - INTERVAL '30 days';

  RAISE NOTICE 'Cleaned up encrypted sessions older than 30 days';
END;
$$;

-- ============================================================
-- 5. Grant permissions
-- ============================================================

-- Allow authenticated users to manage their own sessions
GRANT SELECT, INSERT, UPDATE, DELETE ON encrypted_sessions TO authenticated;

-- Allow service role full access (for admin operations and cleanup)
GRANT ALL ON encrypted_sessions TO service_role;

-- ============================================================
-- 6. Add comments for documentation
-- ============================================================

COMMENT ON TABLE encrypted_sessions IS
  'Encrypted conversation session storage for OpenAI Agents SDK. ' ||
  'Data is encrypted at application layer using AES-256-GCM. ' ||
  'Sessions auto-expire after 30 days.';

COMMENT ON COLUMN encrypted_sessions.thread_id IS
  'Foreign key to chat_threads table';

COMMENT ON COLUMN encrypted_sessions.user_id IS
  'User who owns this session (for RLS)';

COMMENT ON COLUMN encrypted_sessions.encrypted_data IS
  'AES-256-GCM encrypted session data (hex-encoded)';

COMMENT ON COLUMN encrypted_sessions.iv IS
  'Initialization vector for AES-GCM (hex-encoded, 16 bytes)';

COMMENT ON COLUMN encrypted_sessions.auth_tag IS
  'Authentication tag for AES-GCM (hex-encoded, 16 bytes)';

COMMENT ON COLUMN encrypted_sessions.updated_at IS
  'Last update timestamp (used for auto-cleanup)';

-- ============================================================
-- 7. Migration completion log
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 0008_encrypted_sessions completed successfully';
  RAISE NOTICE 'Created: encrypted_sessions table with RLS';
  RAISE NOTICE 'Features: AES-256-GCM encryption, 30-day auto-cleanup';
  RAISE NOTICE 'Next step: Set SESSION_ENCRYPTION_KEY environment variable';
END $$;
