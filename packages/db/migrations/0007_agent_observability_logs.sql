-- 0007_agent_observability_logs.sql
-- Create tables for AgentHooks observability: tool usage and agent execution tracking

-- ============================================================================
-- Tool Usage Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tool_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  tool_name text NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  estimated_cost numeric(10, 6) NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
  success boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS tool_usage_logs_user_id_idx ON public.tool_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS tool_usage_logs_agent_name_idx ON public.tool_usage_logs(agent_name);
CREATE INDEX IF NOT EXISTS tool_usage_logs_tool_name_idx ON public.tool_usage_logs(tool_name);
CREATE INDEX IF NOT EXISTS tool_usage_logs_created_at_idx ON public.tool_usage_logs(created_at DESC);

-- Composite index for user cost analysis
CREATE INDEX IF NOT EXISTS tool_usage_logs_user_cost_idx
  ON public.tool_usage_logs(user_id, created_at DESC, estimated_cost);

-- ============================================================================
-- Agent Execution Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  tokens_used integer CHECK (tokens_used >= 0),
  estimated_cost numeric(10, 6) NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
  success boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS agent_execution_logs_user_id_idx ON public.agent_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS agent_execution_logs_agent_name_idx ON public.agent_execution_logs(agent_name);
CREATE INDEX IF NOT EXISTS agent_execution_logs_created_at_idx ON public.agent_execution_logs(created_at DESC);

-- Composite index for user analytics
CREATE INDEX IF NOT EXISTS agent_execution_logs_user_analytics_idx
  ON public.agent_execution_logs(user_id, created_at DESC, tokens_used, estimated_cost);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.tool_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

-- Tool Usage Logs Policies
CREATE POLICY tool_usage_logs_select_authenticated
  ON public.tool_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY tool_usage_logs_insert_authenticated
  ON public.tool_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Agent Execution Logs Policies
CREATE POLICY agent_execution_logs_select_authenticated
  ON public.agent_execution_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY agent_execution_logs_insert_authenticated
  ON public.agent_execution_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Helper Views for Analytics
-- ============================================================================

-- Daily cost summary per user
CREATE OR REPLACE VIEW public.user_daily_costs AS
SELECT
  user_id,
  DATE(created_at) as date,
  COUNT(*) as execution_count,
  SUM(tokens_used) as total_tokens,
  SUM(estimated_cost) as total_cost
FROM public.agent_execution_logs
GROUP BY user_id, DATE(created_at);

-- Tool usage summary
CREATE OR REPLACE VIEW public.tool_usage_summary AS
SELECT
  user_id,
  tool_name,
  COUNT(*) as usage_count,
  AVG(duration_ms) as avg_duration_ms,
  SUM(estimated_cost) as total_cost
FROM public.tool_usage_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, tool_name;

-- Agent performance metrics
CREATE OR REPLACE VIEW public.agent_performance_metrics AS
SELECT
  agent_name,
  COUNT(*) as execution_count,
  AVG(duration_ms) as avg_duration_ms,
  AVG(tokens_used) as avg_tokens_used,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failure_count,
  ROUND(100.0 * SUM(CASE WHEN success = true THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM public.agent_execution_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;

-- ============================================================================
-- Data Retention Policy (Optional)
-- ============================================================================

-- Function to clean up old logs (keeps last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_agent_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.tool_usage_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  DELETE FROM public.agent_execution_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Agent observability logging tables created!';
  RAISE NOTICE '   - tool_usage_logs: Track individual tool invocations';
  RAISE NOTICE '   - agent_execution_logs: Track agent executions';
  RAISE NOTICE '   - RLS policies: Enabled for user data isolation';
  RAISE NOTICE '   - Analytics views: user_daily_costs, tool_usage_summary, agent_performance_metrics';
  RAISE NOTICE '   - Data retention: cleanup_old_agent_logs() function (90 days)';
END $$;
