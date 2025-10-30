# Agent Routes Security Audit

**Date**: 2025-10-30
**Session**: #6
**Auditor**: Claude Code (Session #6)

---

## Executive Summary

Audited **8 agent API routes** for security vulnerabilities, authentication, and architecture consistency.

### Critical Findings

🚨 **HIGH SEVERITY**:
- **0 out of 8 routes** have authentication
- **1 route** accesses shared agent memories (no user isolation)
- **2 routes** are AI-heavy and lack rate limiting

⚠️ **MEDIUM SEVERITY**:
- **6 routes** use `any` types in error handling
- **2 test routes** are publicly accessible (should be dev-only)

### Summary Statistics

| Category | Count | Percentage |
|----------|-------|------------|
| **No Authentication** | 8/8 | 100% |
| **No Rate Limiting** | 8/8 | 100% |
| **Using `any` types** | 6/8 | 75% |
| **Needs User Isolation** | 1/8 | 12.5% |
| **Test/Debug Routes** | 2/8 | 25% |

---

## Route-by-Route Analysis

### 1. `/api/agent/classify` - Intent Classification

**File**: `apps/web/src/app/api/agent/classify/route.ts`

**Purpose**: Classifies user query complexity (simple, moderate, complex) using pattern matching and GPT-5 Nano.

**Security Issues**:
- ❌ **No authentication** - Anyone can call this endpoint
- ❌ **No rate limiting** - AI calls can be abused
- ❌ **Uses `any` type** in error handling (line 78)

**User Isolation**: N/A (stateless classification)

**Recommendations**:
1. Add `withAuth` middleware
2. Add rate limiting with `ai` preset (5 req/min)
3. Fix `any` type to `unknown`

**Priority**: 🟡 **MEDIUM** (Used for routing, but not critical data)

**Impact**: Low - classification only, no data access

---

### 2. `/api/agent/config` - Agent Configuration

**File**: `apps/web/src/app/api/agent/config/route.ts`

**Purpose**: Returns agent model configuration and capabilities (GET only).

**Security Issues**:
- ❌ **No authentication** - Exposes internal configuration
- ✅ **No user data** - Read-only environment variables

**User Isolation**: N/A (global configuration)

**Recommendations**:
1. Add `withAuth` middleware (prevent info disclosure)
2. Consider caching response (static config)

**Priority**: 🟢 **LOW** (Minimal risk - exposes model names only)

**Impact**: Low - only environment variables

---

### 3. `/api/agent/memory` - Agent Memory Operations

**File**: `apps/web/src/app/api/agent/memory/route.ts`

**Purpose**: CRUD operations for agent memories (GET, POST, DELETE).

**Security Issues**:
- 🚨 **CRITICAL: No authentication** - Anyone can read/write/delete agent memories
- 🚨 **CRITICAL: Shared memories** - All users share same agent memories (by `agent_name`)
- ❌ **Uses `any` types** in error handling (lines 31, 70, 102)
- ❌ **No validation** - Body parameters not validated

**Current Behavior**:
- Agent memories are shared globally by `agent_name` (default: 'FROK Assistant')
- No Row Level Security (RLS) check
- Anyone can query: `?agent_name=FROK Assistant&limit=100`

**User Isolation**:
- ⚠️ **Design Decision Required**: Should agent memories be:
  1. **User-specific** - Each user has their own agent memories?
  2. **Shared** - All users share agent memories (current behavior)?
  3. **Hybrid** - Some memories shared, some user-specific?

**Recommendations**:
1. **CRITICAL**: Add `withAuth` middleware
2. **CRITICAL**: Decide on user isolation strategy
3. Add Zod validation schemas
4. Fix `any` types to `unknown`
5. Add rate limiting (standard preset)

**Priority**: 🔴 **CRITICAL** (Anyone can manipulate agent knowledge base)

**Impact**: HIGH - Core agent functionality, knowledge persistence

---

### 4. `/api/agent/run` - Synchronous Agent Execution

**File**: `apps/web/src/app/api/agent/run/route.ts`

**Purpose**: Executes agent workflow synchronously (POST and GET).

**Security Issues**:
- ❌ **No authentication** - Anyone can execute agent workflows
- ❌ **No rate limiting** - AI execution is expensive (uses `runWorkflow`)
- ❌ **Uses `any` types** in error handling (lines 14, 31)

**User Isolation**: Depends on `runWorkflow` internals (needs investigation)

**Recommendations**:
1. Add `withAuth` middleware
2. Add rate limiting with `ai` preset (5 req/min)
3. Fix `any` types to `unknown`
4. Consider deprecating GET endpoint (security: queries in URLs get logged)

**Priority**: 🟠 **HIGH** (Expensive AI operations, public access)

**Impact**: HIGH - Core agent functionality, expensive operations

---

### 5. `/api/agent/smart-stream` - Smart Streaming Agent

**File**: `apps/web/src/app/api/agent/smart-stream/route.ts`

**Purpose**: Intelligent streaming agent with query classification and model selection.

**Security Issues**:
- ❌ **No authentication** - Anyone can stream agent responses
- ❌ **No rate limiting** - Most expensive endpoint (uses multiple AI models)
- ⚠️ **Accepts images** - Vision API usage (even more expensive)

**Features**:
- Query classification (simple/moderate/complex)
- Dynamic model selection (Nano → Mini → Think)
- Supports text + images
- Reasoning effort detection

**User Isolation**: Needs investigation (likely requires user context)

**Recommendations**:
1. **CRITICAL**: Add `withAuth` middleware
2. **CRITICAL**: Add rate limiting with `ai` preset (5 req/min)
3. Consider separate rate limit for image uploads (2 req/min)
4. Pass userId to agent for personalization

**Priority**: 🔴 **CRITICAL** (Most expensive endpoint, no protection)

**Impact**: CRITICAL - Highest cost, core user interaction

---

### 6. `/api/agent/stream` - Basic Streaming Agent

**File**: `apps/web/src/app/api/agent/stream/route.ts`

**Purpose**: Basic streaming agent execution with tool support.

**Security Issues**:
- ❌ **No authentication** - Anyone can stream agent responses
- ❌ **No rate limiting** - Expensive AI streaming
- ❌ **Uses `any` types** (line 28)

**Features**:
- Supports text + images
- Tool integration (HA search, memory, web search)
- Streaming responses

**User Isolation**: Needs investigation

**Recommendations**:
1. **CRITICAL**: Add `withAuth` middleware
2. **CRITICAL**: Add rate limiting with `ai` preset (5 req/min)
3. Fix `any` types
4. Pass userId to agent for personalization

**Priority**: 🔴 **CRITICAL** (Expensive, public access)

**Impact**: CRITICAL - High cost, core user interaction

---

### 7. `/api/agent/ha-test` - Home Assistant Test

**File**: `apps/web/src/app/api/agent/ha-test/route.ts`

**Purpose**: Test endpoint for Home Assistant integration (GET only).

**Security Issues**:
- ❌ **No authentication** - Public test endpoint
- ❌ **Should be dev-only** - Test routes shouldn't be in production
- ❌ **Uses `any` type** (line 14)

**Recommendations**:
1. Add environment check: Only enable in development
2. Add `withAuth` middleware for production
3. Fix `any` type
4. Consider moving to `/api/dev/ha-test`

**Priority**: 🟡 **MEDIUM** (Test endpoint, should be restricted)

**Impact**: LOW - Test functionality only

---

### 8. `/api/agent/test` - Simple Agent Test

**File**: `apps/web/src/app/api/agent/test/route.ts`

**Purpose**: Test endpoint for simple agent workflows (GET only).

**Security Issues**:
- ❌ **No authentication** - Public test endpoint
- ❌ **Should be dev-only** - Test routes shouldn't be in production
- ❌ **Uses `any` type** (line 14)

**Recommendations**:
1. Add environment check: Only enable in development
2. Add `withAuth` middleware for production
3. Fix `any` type
4. Consider moving to `/api/dev/agent-test`

**Priority**: 🟡 **MEDIUM** (Test endpoint, should be restricted)

**Impact**: LOW - Test functionality only

---

## Priority Matrix

### 🔴 CRITICAL (Fix Immediately)

1. **`/api/agent/memory`** - Shared knowledge base, no auth
2. **`/api/agent/smart-stream`** - Most expensive, no protection
3. **`/api/agent/stream`** - Expensive, no protection
4. **`/api/agent/run`** - Expensive execution, no protection

### 🟠 HIGH (Fix This Session)

5. **`/api/agent/classify`** - AI calls, no rate limiting

### 🟡 MEDIUM (Fix Soon)

6. **`/api/agent/ha-test`** - Test endpoint, should be dev-only
7. **`/api/agent/test`** - Test endpoint, should be dev-only

### 🟢 LOW (Can Defer)

8. **`/api/agent/config`** - Read-only config, minimal risk

---

## Architectural Questions

### 1. Agent Memory User Isolation Strategy

**Current State**: All users share agent memories by `agent_name`.

**Options**:

**A) User-Specific Memories (Recommended)**
```typescript
// Each user gets their own agent memories
const { data } = await supabase
  .from('agent_memories')
  .select('*')
  .eq('user_id', userId)  // ← Add user isolation
  .eq('agent_name', agentName);
```

**Pros**: Privacy, personalization, security
**Cons**: Agents can't share knowledge across users

**B) Shared Memories (Current)**
```typescript
// All users share agent memories
const { data } = await supabase
  .from('agent_memories')
  .select('*')
  .eq('agent_name', agentName);  // No user filter
```

**Pros**: Agent learns from all users
**Cons**: Privacy concerns, can't personalize

**C) Hybrid (Best of Both)**
```typescript
// Query both user-specific AND shared memories
const { data } = await supabase
  .from('agent_memories')
  .select('*')
  .eq('agent_name', agentName)
  .or(`user_id.eq.${userId},is_shared.eq.true`);
```

**Pros**: Privacy + shared knowledge
**Cons**: More complex schema

**Recommendation**: Option A (User-Specific) for privacy compliance.

---

### 2. Test Endpoints in Production

**Options**:

**A) Environment-Gated (Recommended)**
```typescript
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }
  // ... test logic
}
```

**B) Move to `/api/dev/*`**
- Rename routes
- Add middleware to block `/api/dev/*` in production

**C) Delete Entirely**
- Remove test routes before production deployment

**Recommendation**: Option A (simplest, safest)

---

## Implementation Plan

### Phase 1: Critical Security Fixes (Priority)

**Estimated Time**: 2 hours

1. ✅ Audit complete
2. ⏳ Add authentication to all agent routes
3. ⏳ Add rate limiting to AI-heavy routes
4. ⏳ Implement user isolation strategy for agent memories
5. ⏳ Add Zod validation to `/api/agent/memory`

### Phase 2: Type Safety & Quality (This Session)

**Estimated Time**: 1 hour

6. ⏳ Fix all `any` types to `unknown`
7. ⏳ Add environment gating to test routes

### Phase 3: Testing (This Session)

**Estimated Time**: 30 minutes

8. ⏳ Test agent functionality with authentication
9. ⏳ Verify rate limiting works
10. ⏳ Test user isolation

---

## Risk Assessment

### Before Fixes

| Risk Category | Level | Description |
|---------------|-------|-------------|
| **Unauthorized Access** | 🔴 CRITICAL | Anyone can use AI agent without auth |
| **Cost/Abuse** | 🔴 CRITICAL | No rate limiting on expensive AI calls |
| **Data Privacy** | 🔴 CRITICAL | Shared agent memories, no isolation |
| **Information Disclosure** | 🟡 MEDIUM | Test endpoints expose internals |

### After Fixes

| Risk Category | Level | Description |
|---------------|-------|-------------|
| **Unauthorized Access** | 🟢 LOW | All routes require authentication |
| **Cost/Abuse** | 🟢 LOW | Rate limiting prevents abuse (5 req/min) |
| **Data Privacy** | 🟢 LOW | User-specific agent memories |
| **Information Disclosure** | 🟢 LOW | Test routes gated by environment |

---

## Code Quality Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Routes with Auth** | 0/8 (0%) | 8/8 (100%) | 100% |
| **Routes with Rate Limiting** | 0/8 (0%) | 4/8 (50%) | 50%+ |
| **Routes with Validation** | 0/8 (0%) | 1/8 (12.5%) | 100% |
| **`any` Types** | 6/8 (75%) | 0/8 (0%) | 0% |
| **User Isolation** | 0/1 (0%) | 1/1 (100%) | 100% |

---

## Next Steps

1. **Immediate**: Fix critical routes (memory, smart-stream, stream, run)
2. **This Session**: Complete all authentication + rate limiting
3. **Next Session**: Consider migrating agent page to TanStack Query

---

**Audit Complete**: ✅
**Status**: Ready for Implementation
**Next Step**: Begin Phase 1 - Critical Security Fixes
