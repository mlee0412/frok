-- Migration: User Roles & Permissions (RBAC)
-- Created: 2025-11-15
-- Purpose: Implement role-based access control for multi-user authorization

-- ============================================================================
-- User Roles Table
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, role) -- User can have each role only once
);

-- Index for fast role lookups
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_roles_role ON user_roles(role) WHERE is_active = TRUE;
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- Permissions Table (for granular control)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50), -- e.g., 'chat', 'agent', 'admin', 'analytics'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Role Permissions Mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- User-Specific Permission Overrides (optional granular control)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = grant, FALSE = revoke
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, permission_id)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_id);

-- ============================================================================
-- Default Permissions
-- ============================================================================

INSERT INTO permissions (name, description, category) VALUES
  -- Chat permissions
  ('chat.create', 'Create new chat threads', 'chat'),
  ('chat.read', 'Read chat messages', 'chat'),
  ('chat.update', 'Update chat messages', 'chat'),
  ('chat.delete', 'Delete chat threads and messages', 'chat'),
  ('chat.share', 'Share chat threads publicly', 'chat'),

  -- Agent permissions
  ('agent.use', 'Use AI agents', 'agent'),
  ('agent.configure', 'Configure agent settings', 'agent'),
  ('agent.tools.ha', 'Use Home Assistant tools', 'agent'),
  ('agent.tools.memory', 'Use memory tools', 'agent'),
  ('agent.tools.web', 'Use web search tools', 'agent'),

  -- Memory permissions
  ('memory.add', 'Add new memories', 'memory'),
  ('memory.search', 'Search memories', 'memory'),
  ('memory.delete', 'Delete memories', 'memory'),

  -- Admin permissions
  ('admin.users.read', 'View user list and details', 'admin'),
  ('admin.users.manage', 'Manage users (roles, permissions)', 'admin'),
  ('admin.analytics.view', 'View analytics and metrics', 'admin'),
  ('admin.system.configure', 'Configure system settings', 'admin'),

  -- Export permissions
  ('export.pdf', 'Export conversations to PDF', 'export'),
  ('export.docx', 'Export conversations to DOCX', 'export'),
  ('export.pptx', 'Export conversations to PPTX', 'export')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Default Role Permissions
-- ============================================================================

-- Admin role (full access)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- User role (standard access, no admin features)
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions
WHERE category IN ('chat', 'agent', 'memory', 'export')
  AND name NOT LIKE 'admin.%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Guest role (read-only access)
INSERT INTO role_permissions (role, permission_id)
SELECT 'guest', id FROM permissions
WHERE name IN ('chat.read', 'agent.use', 'memory.search')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get active roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (role user_role, granted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role, ur.granted_at, ur.expires_at
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Check for explicit user permission override (grant or revoke)
  SELECT granted INTO v_has_permission
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
    AND p.name = p_permission_name
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
  LIMIT 1;

  -- If explicit override exists, return it
  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;

  -- Otherwise, check role-based permissions
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role = ur.role
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND p.name = p_permission_name
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_name VARCHAR, category VARCHAR, source VARCHAR) AS $$
BEGIN
  RETURN QUERY
  -- Role-based permissions
  SELECT DISTINCT p.name, p.category, 'role:' || ur.role::TEXT
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role = ur.role
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

  UNION

  -- User-specific permissions (grants only, revokes are excluded)
  SELECT p.name, p.category, 'user:explicit'
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
    AND up.granted = TRUE
    AND (up.expires_at IS NULL OR up.expires_at > NOW());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY user_roles_select_own ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own permissions
CREATE POLICY user_permissions_select_own ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage all roles and permissions
CREATE POLICY user_roles_admin_all ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = TRUE
    )
  );

CREATE POLICY user_permissions_admin_all ON user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = TRUE
    )
  );

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Grant default 'user' role to existing users
-- ============================================================================

INSERT INTO user_roles (user_id, role, granted_by, granted_at)
SELECT id, 'user'::user_role, NULL, NOW()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.users.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Stores user role assignments with expiration support';
COMMENT ON TABLE permissions IS 'Defines all available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Maps permissions to roles';
COMMENT ON TABLE user_permissions IS 'User-specific permission overrides (grants/revokes)';
COMMENT ON FUNCTION user_has_permission IS 'Check if a user has a specific permission (considers both role and user overrides)';
COMMENT ON FUNCTION get_user_permissions IS 'Get all effective permissions for a user';
COMMENT ON FUNCTION get_user_roles IS 'Get all active roles for a user';
