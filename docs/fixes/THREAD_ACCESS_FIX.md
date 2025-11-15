# Thread Access Fix - "Thread not found or access denied" Error

**Date**: 2025-11-15
**Issue**: Text chat returning blank AI responses with "Thread not found or access denied" error
**Root Cause**: RLS policy conflict in DEV_BYPASS_AUTH mode

---

## Problem Description

When using DEV_BYPASS_AUTH mode, agent stream endpoints failed with:
```
[Agent] Error: Thread not found or access denied
[Agent] Failed to parse SSE data: {"error":"Thread not found or access denied"}
```

This caused chat messages to fail with blank AI responses.

---

## Root Cause Analysis

### The Issue

1. **DEV_BYPASS_AUTH mode** creates a mock user with `userId: 'dev-user-id'`
2. **Supabase client** was created with ANON key (not service role)
3. **No JWT session** was established (auth was bypassed)
4. **RLS policies** on `chat_threads` check `auth.uid()` which returned **NULL**
5. **Query failed** because `NULL != user_id` in database
6. Even with manual `.eq('user_id', user_id)` check, RLS filtering happened FIRST

### RLS Policy (from 0011_chat_rls_policies.sql)

```sql
CREATE POLICY chat_threads_own_read ON public.chat_threads
  FOR SELECT
  USING (user_id = auth.uid());  -- ❌ auth.uid() = NULL in dev bypass mode
```

---

## Solution Implemented

### 1. Use Service Role Client in DEV_BYPASS_AUTH Mode

**File**: `apps/web/src/lib/api/withAuth.ts`

**Change**: Replace ANON key client with SERVICE ROLE client to bypass RLS

```typescript
// BEFORE: Used anon key (RLS enforced, auth.uid() = NULL)
const supabase = createServerClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,  // ❌ RLS enforced
  { cookies: { ... } }
);

// AFTER: Use service role key (RLS bypassed)
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,  // ✅ RLS bypassed
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**Fallback**: If `SUPABASE_SERVICE_ROLE_KEY` is missing, falls back to anon key with warning.

### 2. Enhanced Error Logging

**Files**:
- `apps/web/src/app/api/agent/smart-stream/route.ts`
- `apps/web/src/app/api/agent/stream-with-progress/route.ts`
- `apps/web/src/app/api/agent/smart-stream-enhanced/route.ts`

**Change**: Added detailed error logging for thread lookup failures

```typescript
// Enhanced error logging
console.error('[smart-stream] Thread lookup failed:', {
  threadId,
  user_id,
  error: threadError,
  isDev: process.env["NODE_ENV"] === 'development',
  hasDevBypass: process.env["DEV_BYPASS_AUTH"] === 'true',
});

// Debug information in development
send({
  error: 'Thread not found or access denied',
  debug: process.env.NODE_ENV === 'development' ? {
    threadId,
    user_id,
    errorCode: threadError?.code,
    hint: 'Check if thread exists and belongs to user. In dev mode with DEV_BYPASS_AUTH, ensure SUPABASE_SERVICE_ROLE_KEY is set.'
  } : undefined
});
```

---

## Environment Setup Required

### .env.local (Development Only)

Ensure `SUPABASE_SERVICE_ROLE_KEY` is set when using `DEV_BYPASS_AUTH`:

```bash
# Required for DEV_BYPASS_AUTH mode to work properly
DEV_BYPASS_AUTH=true
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # ✅ REQUIRED
```

**Where to find**: Supabase Dashboard → Settings → API → service_role key (secret)

⚠️ **WARNING**: Service role key bypasses RLS. Only use in development with `DEV_BYPASS_AUTH`.

---

## Files Modified

1. `apps/web/src/lib/api/withAuth.ts` - Service role client in dev bypass mode
2. `apps/web/src/app/api/agent/smart-stream/route.ts` - Enhanced error logging
3. `apps/web/src/app/api/agent/stream-with-progress/route.ts` - Enhanced error logging
4. `apps/web/src/app/api/agent/smart-stream-enhanced/route.ts` - Enhanced error logging

---

## Testing

### Before Fix
```
User sends message → "Thread not found or access denied" → Blank AI response
```

### After Fix
```
User sends message → Thread lookup succeeds → AI response streams normally
```

### How to Verify

1. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
2. Set `DEV_BYPASS_AUTH=true`
3. Start dev server: `pnpm dev`
4. Send a chat message
5. Check console logs for:
   ```
   [withAuth] ⚠️  DEV_BYPASS_AUTH is enabled - skipping authentication!
   [withAuth] ⚠️  Using SERVICE ROLE client - RLS is BYPASSED!
   ```
6. Verify chat messages receive AI responses

---

## Related Documentation

- [RLS Policies Migration](../../packages/db/migrations/0011_chat_rls_policies.sql)
- [RBAC System](../RBAC.md)
- [withAuth API](../../apps/web/src/lib/api/withAuth.ts)

---

## Security Considerations

✅ **Production Safety**: Production check prevents `DEV_BYPASS_AUTH` in production
✅ **Service Role Guarding**: Only used when `DEV_BYPASS_AUTH=true` in development
✅ **Warning Logs**: Console warnings when RLS is bypassed
✅ **Fallback Protection**: Falls back to anon key if service role key missing

❌ **Never in Production**: Service role key should NEVER be exposed in production
❌ **Dev Only**: This fix only affects `NODE_ENV=development` with `DEV_BYPASS_AUTH=true`
