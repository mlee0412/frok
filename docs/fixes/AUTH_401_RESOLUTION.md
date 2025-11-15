# 401 Unauthorized Error - Resolution Guide

**Date**: 2025-11-15
**Issue**: `POST /api/agent/smart-stream` returns 401 Unauthorized
**Symptom**: "Failed to send message" error in agent chat

---

## Root Cause

The API route requires authentication via `withAuth(req)`, but:

1. **No `.env.local` file exists** → Environment variables not configured
2. **DEV_BYPASS_AUTH not enabled** → Real authentication required
3. **User not logged in** → No valid session token

---

## Solution Options

### Option 1: Development Bypass Mode (Recommended for Quick Testing)

**Use this for local development without setting up full authentication**

#### Step 1: Create `.env.local`

```bash
# Copy the example file
cp .env.example .env.local
```

#### Step 2: Configure Environment Variables

Edit `.env.local` and add:

```bash
# Enable development auth bypass
DEV_BYPASS_AUTH=true

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://oxosqmxohnhranyihqoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94b3NxbXhvaG5ocmFueWlocW96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MDI4NSwiZXhwIjoyMDc2MTI2Mjg1fQ.qKFzr0iEU4zxpu2UfBknG9b5eipPcEAY6T0n58HO6FU

# OpenAI API Key (for AI responses)
OPENAI_API_KEY=your_openai_api_key_here
```

**Where to find keys**:
- **Supabase URL**: Already in `.env.example` (https://oxosqmxohnhranyihqoz.supabase.co)
- **Supabase ANON Key**: Supabase Dashboard → Settings → API → `anon` key
- **Supabase Service Role Key**: Already in `.env.example` (or Dashboard → Settings → API → `service_role` key)
- **OpenAI API Key**: https://platform.openai.com/api-keys

#### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Start fresh
pnpm dev
```

#### Step 4: Verify Setup

Check server console for:
```
[withAuth] ⚠️  DEV_BYPASS_AUTH is enabled - skipping authentication!
[withAuth] ⚠️  Using SERVICE ROLE client - RLS is BYPASSED!
```

---

### Option 2: Proper Authentication (Production-Ready)

**Use this for production-like development with real user sessions**

#### Step 1: Create `.env.local`

```bash
cp .env.example .env.local
```

#### Step 2: Configure Supabase Only

```bash
# NO DEV_BYPASS_AUTH (real auth required)

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://oxosqmxohnhranyihqoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
```

#### Step 3: Restart Dev Server

```bash
pnpm dev
```

#### Step 4: Sign In

1. Navigate to http://localhost:3000/auth/sign-in
2. Sign in with Supabase credentials
3. Session cookie will be set
4. Agent chat will work with real user context

---

## Verification Steps

### 1. Check Environment Loading

Server console should show environment variables loaded:
```bash
✓ Ready in 2.5s
○ Compiling / ...
```

### 2. Test API Endpoint

Try sending a message in agent chat:
- ✅ **Success**: Message sends, AI responds
- ❌ **401 Error**: Auth still failing → Check Step 3

### 3. Debug Auth Issues

If still getting 401:

**Check server logs**:
```bash
# Should see ONE of these:
[withAuth] ⚠️  DEV_BYPASS_AUTH is enabled    # Bypass mode
# OR
[withAuth] Authenticated user: <user-id>     # Real auth mode
```

**If DEV_BYPASS_AUTH enabled but still 401**:
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Restart dev server (environment changes require restart)

**If real auth mode but still 401**:
- User not logged in → Go to /auth/sign-in
- Session expired → Sign in again
- ANON key wrong → Check Supabase Dashboard

---

## Quick Troubleshooting

### "Failed to send message" - 401 Error

**Cause**: Authentication failing
**Fix**: See Option 1 (DEV_BYPASS_AUTH) or Option 2 (Real Auth) above

### "Thread not found or access denied"

**Cause**: RLS policy blocking access
**Fix**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set when using DEV_BYPASS_AUTH

### Server shows "SUPABASE_SERVICE_ROLE_KEY is missing"

**Cause**: `.env.local` doesn't have service role key
**Fix**: Add key from `.env.example` or Supabase Dashboard

### Changes not taking effect

**Cause**: Server not restarted after env changes
**Fix**: Stop server (Ctrl+C) and run `pnpm dev` again

---

## Environment File Template

**Minimal `.env.local` for development**:

```bash
# OPTION 1: Development Bypass (No Login Required)
DEV_BYPASS_AUTH=true
NEXT_PUBLIC_SUPABASE_URL=https://oxosqmxohnhranyihqoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_example>
OPENAI_API_KEY=<your_openai_key>

# OPTION 2: Real Auth (Login Required, No Bypass)
# DEV_BYPASS_AUTH=false  # or comment out
NEXT_PUBLIC_SUPABASE_URL=https://oxosqmxohnhranyihqoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
OPENAI_API_KEY=<your_openai_key>
```

---

## Related Documentation

- [Thread Access Fix](THREAD_ACCESS_FIX.md) - RLS bypass implementation
- [withAuth API](../../apps/web/src/lib/api/withAuth.ts) - Authentication middleware
- [RBAC System](../RBAC.md) - Role-based access control

---

## Security Notes

⚠️ **DEV_BYPASS_AUTH**:
- Only works in `NODE_ENV=development`
- Production check prevents accidental bypass
- Uses service role key → bypasses all RLS

⚠️ **Service Role Key**:
- Full database access (bypasses RLS)
- NEVER commit to git
- NEVER expose in production
- Only use in `.env.local` for development

✅ **Production Deployment**:
- DEV_BYPASS_AUTH automatically disabled
- Real Supabase authentication required
- RLS policies enforced
- No service role key needed
