# Role-Based Access Control (RBAC) System

**Created**: 2025-11-15
**Status**: Production-ready

---

## Overview

FROK implements a comprehensive Role-Based Access Control (RBAC) system for multi-user authorization and permission management.

### Features

- ✅ **Role-Based Permissions** - Assign roles (admin, user, guest) with predefined permissions
- ✅ **Granular Permissions** - 20+ permissions across chat, agent, memory, admin, and export categories
- ✅ **User-Specific Overrides** - Grant/revoke individual permissions per user
- ✅ **Permission Expiration** - Time-limited permissions and roles
- ✅ **Efficient Checking** - Database-level functions for fast permission verification
- ✅ **Row-Level Security** - Supabase RLS policies protect role and permission data

---

## Database Schema

### Tables

**`user_roles`** - User role assignments
- user_id, role ('admin' | 'user' | 'guest')
- granted_by, granted_at, expires_at
- is_active

**`permissions`** - Available permissions
- name (e.g., 'chat.create', 'admin.users.manage')
- description, category

**`role_permissions`** - Maps permissions to roles
- role, permission_id

**`user_permissions`** - User-specific permission overrides
- user_id, permission_id, granted (TRUE = grant, FALSE = revoke)
- expires_at

### Database Functions

**`user_has_permission(user_id, permission_name)`** - Check if user has permission
**`get_user_roles(user_id)`** - Get all active roles for user
**`get_user_permissions(user_id)`** - Get all effective permissions for user

---

## Default Roles & Permissions

### Admin Role
Full access to all permissions including:
- All chat, agent, memory, export permissions
- User management (`admin.users.manage`)
- Analytics (`admin.analytics.view`)
- System configuration (`admin.system.configure`)

### User Role (Default)
Standard user access:
- Chat: create, read, update, delete, share
- Agent: use, configure, all tools (HA, memory, web)
- Memory: add, search, delete
- Export: PDF, DOCX, PPTX

### Guest Role
Read-only access:
- Chat: read only
- Agent: use (no configuration)
- Memory: search only

---

## API Usage

### Basic Authentication

```typescript
import { withAuth } from '@/lib/api/withAuth';

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  const { userId } = auth.user;
  // ... rest of route logic
}
```

### Permission-Based Access

```typescript
import { requirePermission } from '@/lib/api/withAuth';

export async function DELETE(req: NextRequest) {
  // Require specific permission
  const auth = await requirePermission(req, 'chat.delete');
  if (!auth.ok) return auth.response;

  // User has 'chat.delete' permission
  const { userId } = auth.user;
  // ... delete logic
}
```

### Role-Based Access

```typescript
import { requireRole } from '@/lib/api/withAuth';

export async function GET(req: NextRequest) {
  // Require admin role
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  // User is admin
  // ... admin-only logic
}
```

### Manual Permission Checking

```typescript
import { withAuth, hasPermission } from '@/lib/api/withAuth';

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Check multiple permissions
  const canDelete = await hasPermission(auth.user, 'chat.delete');
  const canShare = await hasPermission(auth.user, 'chat.share');

  if (canDelete) {
    // Delete logic
  }

  if (canShare) {
    // Share logic
  }
}
```

---

## Available Permissions

### Chat Permissions
- `chat.create` - Create new chat threads
- `chat.read` - Read chat messages
- `chat.update` - Update chat messages
- `chat.delete` - Delete chat threads and messages
- `chat.share` - Share chat threads publicly

### Agent Permissions
- `agent.use` - Use AI agents
- `agent.configure` - Configure agent settings
- `agent.tools.ha` - Use Home Assistant tools
- `agent.tools.memory` - Use memory tools
- `agent.tools.web` - Use web search tools

### Memory Permissions
- `memory.add` - Add new memories
- `memory.search` - Search memories
- `memory.delete` - Delete memories

### Admin Permissions
- `admin.users.read` - View user list and details
- `admin.users.manage` - Manage users (roles, permissions)
- `admin.analytics.view` - View analytics and metrics
- `admin.system.configure` - Configure system settings

### Export Permissions
- `export.pdf` - Export conversations to PDF
- `export.docx` - Export conversations to DOCX
- `export.pptx` - Export conversations to PPTX

---

## Managing Permissions

### Grant Role to User

```sql
INSERT INTO user_roles (user_id, role, granted_by)
VALUES ('user-uuid', 'admin', 'granter-uuid');
```

### Grant Specific Permission to User

```sql
-- First, get the permission ID
SELECT id FROM permissions WHERE name = 'admin.analytics.view';

-- Then grant it
INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
VALUES ('user-uuid', 'permission-uuid', TRUE, 'granter-uuid');
```

### Revoke Permission from User

```sql
UPDATE user_permissions
SET granted = FALSE
WHERE user_id = 'user-uuid' AND permission_id = 'permission-uuid';
```

### Set Permission Expiration

```sql
UPDATE user_roles
SET expires_at = NOW() + INTERVAL '30 days'
WHERE user_id = 'user-uuid' AND role = 'admin';
```

---

## Client-Side Usage

### Get User Permissions

```typescript
import { getUserPermissions } from '@/lib/api/withAuth';

const auth = await withAuth(req);
if (auth.ok) {
  const permissions = await getUserPermissions(auth.user);
  console.log(permissions);
  // [{ permission_name: 'chat.create', category: 'chat', source: 'role:user' }, ...]
}
```

### Check Roles

```typescript
import { getUserRoles, hasRole } from '@/lib/api/withAuth';

const auth = await withAuth(req);
if (auth.ok) {
  const roles = await getUserRoles(auth.user);
  const isAdmin = await hasRole(auth.user, 'admin');
}
```

---

## Migration & Setup

### Apply Migration

```bash
# Connect to Supabase and run:
psql -h db.xxx.supabase.co -U postgres -d postgres -f packages/db/migrations/0012_user_roles_permissions.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `0012_user_roles_permissions.sql`
3. Execute

### Verify Setup

```sql
-- Check if tables exist
SELECT * FROM user_roles LIMIT 1;
SELECT * FROM permissions;

-- Check default permissions
SELECT * FROM role_permissions WHERE role = 'user';

-- Verify RPC functions
SELECT user_has_permission('your-user-id', 'chat.create');
```

---

## Best Practices

1. **Always Use Permission Checks** for sensitive operations (delete, admin actions)
2. **Default to 'user' Role** for new signups (already configured)
3. **Use Permission Expiration** for temporary elevated access
4. **Audit Permission Changes** via `granted_by` tracking
5. **Test with Different Roles** before deploying permission changes

---

## Security Considerations

- ✅ **Row-Level Security (RLS)** enabled on all permission tables
- ✅ **Database-level Functions** prevent client-side permission tampering
- ✅ **Explicit Permission Checks** required for all protected routes
- ✅ **Fail-Safe Defaults** - Missing permissions = denied access
- ✅ **Audit Trail** - All permission grants tracked with `granted_by`

---

## Example: Protected Admin Route

```typescript
// apps/web/src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api/withAuth';

export async function GET(req: NextRequest) {
  // Require admin permission
  const auth = await requirePermission(req, 'admin.users.read');
  if (!auth.ok) return auth.response;

  // User is authenticated and has 'admin.users.read' permission
  const supabase = auth.user.supabase;

  const { data: users } = await supabase
    .from('user_roles')
    .select('user_id, role, granted_at');

  return NextResponse.json({ ok: true, users });
}

export async function POST(req: NextRequest) {
  // Require admin management permission
  const auth = await requirePermission(req, 'admin.users.manage');
  if (!auth.ok) return auth.response;

  // User can manage other users
  // ... implementation
}
```

---

## Troubleshooting

### Permission Check Returns False

1. **Verify Migration Applied**: Check if `user_roles` table exists
2. **Check User Has Role**: `SELECT * FROM user_roles WHERE user_id = 'xxx'`
3. **Verify Permission Exists**: `SELECT * FROM permissions WHERE name = 'xxx'`
4. **Check Role Has Permission**: `SELECT * FROM role_permissions WHERE role = 'user'`
5. **Test RPC Function**: `SELECT user_has_permission('user-id', 'permission-name')`

### User Has No Roles

Default 'user' role should be assigned automatically. If missing:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid', 'user'::user_role);
```

---

## Future Enhancements

- [ ] Permission groups for easier bulk assignment
- [ ] Permission templates for common role combinations
- [ ] Audit log for all permission changes
- [ ] UI for permission management (admin dashboard)
- [ ] Permission inheritance (hierarchical roles)

---

**Related Documentation**:
- [withAuth API Reference](../apps/web/src/lib/api/withAuth.ts)
- [Database Migration](../packages/db/migrations/0012_user_roles_permissions.sql)
- [TODO Tracking](docs/development/TODO_TRACKING.md)
