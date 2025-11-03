# FROK Agent System - Comprehensive Analysis

**Generated**: 2025-11-01
**Analysis Scope**: /agent endpoint architecture, tools, routing, and file structure

---

## Executive Summary

The FROK agent system is a **sophisticated AI orchestration platform** built on OpenAI's Agents SDK. It features:

- **Smart routing** with query complexity classification
- **Multi-agent orchestration** with specialized sub-agents
- **5 powerful tools** (Home Assistant, Memory, Web Search)
- **Streaming responses** with Server-Sent Events (SSE)
- **User authentication & rate limiting** (secured in Session #6)
- **Dynamic model selection** (GPT-5 Think/Mini/Nano)

---

## 1. Architecture Overview

### 1.1 High-Level Flow

```
User Input → /agent page → /api/agent/smart-stream → Agent Orchestrator → Tools → Response Stream
```

**Key Components**:
1. **Frontend**: React-based chat interface (`apps/web/src/app/(main)/agent/page.tsx`)
2. **API Layer**: Next.js API routes (`apps/web/src/app/api/agent/*`)
3. **Agent Orchestrator**: Multi-agent coordinator (`apps/web/src/lib/agent/orchestrator.ts`)
4. **Tools**: Integration layer for external services (`apps/web/src/lib/agent/tools-improved.ts`)
5. **Database**: Supabase (chat threads, messages, memories)

### 1.2 Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Input                              │
│                   (Text + Optional Images)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Authentication Layer                         │
│              withAuth() + withRateLimit(5 req/min)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Query Classification                          │
│       Pattern Matching → 'simple' | 'moderate' | 'complex'       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Model Selection                             │
│  simple → gpt-5-nano (fast)                                      │
│  moderate → gpt-5-mini (balanced)                                │
│  complex → gpt-5-think (reasoning)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Routing Decision                               │
│  simple/moderate → Direct Agent (single model)                   │
│  complex → Orchestrator (multi-agent with handoffs)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
            ┌───────▼────┐   ┌───▼───────┐
            │   Direct   │   │Orchestrator│
            │   Agent    │   │  (Router)  │
            │            │   │     +      │
            │  1 Model   │   │ 5 Agents   │
            │  + Tools   │   │  + Tools   │
            └───────┬────┘   └───┬───────┘
                    │            │
                    │            ├─► Home Control Agent
                    │            ├─► Memory Agent
                    │            ├─► Research Agent
                    │            └─► General Problem Solver
                    │
                    └──────┬──────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Tool Execution                              │
│  ha_search, ha_call, memory_add, memory_search, web_search       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Streaming Response                            │
│               SSE (Server-Sent Events) → Frontend                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. API Routes Breakdown

### 2.1 Primary Endpoint: `/api/agent/smart-stream`

**File**: `apps/web/src/app/api/agent/smart-stream/route.ts` (412 lines)

**Purpose**: Main agent interaction endpoint with intelligent routing

**Features**:
- ✅ **Authentication required** (withAuth middleware)
- ✅ **Rate limiting** (5 req/min for AI operations)
- ✅ **Query classification** (pattern matching + GPT-5 Nano)
- ✅ **Dynamic model selection** (Nano/Mini/Think)
- ✅ **Conversation history** (loads last 20 messages from DB)
- ✅ **Multi-modal input** (text + images)
- ✅ **Streaming responses** (SSE with chunked output)
- ✅ **User isolation** (verifies thread ownership)

**Key Code Sections**:

```typescript
// Line 26-56: Query Classification
async function classifyQuery(query: string): Promise<'simple' | 'moderate' | 'complex'>

// Line 62-123: Model Selection Logic
function selectModelAndTools(complexity, userModel)

// Line 125-412: POST Handler
export async function POST(req: NextRequest)
  ├─ Authentication (line 127-128)
  ├─ Rate limiting (line 131-132)
  ├─ Load conversation history (line 158-207)
  ├─ Classify query (line 210)
  ├─ Select model & tools (line 211-214)
  ├─ Load toolset (line 216-239)
  ├─ Create agent/orchestrator (line 241-365)
  └─ Stream response (line 366-391)
```

**Model Selection Strategy**:

| Complexity | Default Model | Tools | Orchestrator | Use Case |
|------------|---------------|-------|--------------|----------|
| **Simple** | gpt-5-nano | HA, Memory, Web | ❌ No | Quick commands (lights, weather) |
| **Moderate** | gpt-5-mini | HA, Memory, Web | ❌ No | Common questions, basic queries |
| **Complex** | gpt-5-think | HA, Memory, Web | ✅ Yes | Multi-step reasoning, analysis |

**User Model Override**:
- Thread settings can force a specific model (gpt-5-nano, gpt-5-mini, gpt-5-think)
- Overrides complexity classification

---

### 2.2 Other Agent Endpoints

#### `/api/agent/stream` (Basic Streaming)

**File**: `apps/web/src/app/api/agent/stream/route.ts`

**Purpose**: Simplified streaming agent without classification

**Security**: ✅ Auth + Rate limiting (Session #6)

**Differences from smart-stream**:
- No query classification
- No dynamic model selection
- Direct agent execution only

---

#### `/api/agent/run` (Synchronous Execution)

**File**: `apps/web/src/app/api/agent/run/route.ts`

**Purpose**: Non-streaming, synchronous agent execution

**Security**: ✅ Auth + Rate limiting (Session #6)

**Endpoints**:
- POST `/api/agent/run` - JSON body
- GET `/api/agent/run?input=...` - URL param (less secure)

---

#### `/api/agent/classify` (Query Classification)

**File**: `apps/web/src/app/api/agent/classify/route.ts`

**Purpose**: Classify query complexity (used internally by smart-stream)

**Security**: ✅ Auth + Rate limiting (Session #6)

**Returns**: `{ complexity: 'simple' | 'moderate' | 'complex' }`

---

#### `/api/agent/memory` (Agent Memory CRUD)

**File**: `apps/web/src/app/api/agent/memory/route.ts`

**Purpose**: Manage agent-specific memories (learning over time)

**Security**: ✅ Auth + Validation (Session #6)

**Endpoints**:
- GET - List agent memories (with user isolation)
- POST - Add new agent memory
- DELETE - Remove agent memory

**User Isolation Strategy**: Each user has their own agent memories (decided in Session #6)

---

#### `/api/agent/config` (Configuration)

**File**: `apps/web/src/app/api/agent/config/route.ts`

**Purpose**: Return agent model configuration

**Security**: ✅ Auth (Session #6)

**Returns**: Model names, available tools, capabilities

---

#### `/api/agent/test` & `/api/agent/ha-test` (Testing)

**Files**:
- `apps/web/src/app/api/agent/test/route.ts`
- `apps/web/src/app/api/agent/ha-test/route.ts`

**Purpose**: Development-only testing endpoints

**Security**: ✅ Environment-gated (returns 404 in production)

---

## 3. Agent Orchestrator

### 3.1 File: `orchestrator.ts`

**Location**: `apps/web/src/lib/agent/orchestrator.ts` (277 lines)

**Core Function**: `createAgentSuite(options)` - Creates a multi-agent system

**Architecture**: **5 Specialized Agents + 1 Orchestrator**

```
┌───────────────────────────────────────────────────────────────┐
│                    FROK Orchestrator                           │
│        (Fast Router Model: gpt-5-nano by default)              │
│                                                                 │
│  Role: Route requests to best specialist agent                 │
│  Temperature: 0.2 (deterministic)                               │
│  Guardrails: Input sanitization + Output quality               │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌──────▼───────┐  ┌──────────────┐
│ Home Control   │  │   Memory     │  │   Research   │
│   Specialist   │  │  Specialist  │  │  Specialist  │
├────────────────┤  ├──────────────┤  ├──────────────┤
│ Tools:         │  │ Tools:       │  │ Tools:       │
│ - ha_search    │  │ - memory_add │  │ - web_search │
│ - ha_call      │  │ - memory_s.. │  │ - memory_s.. │
│                │  │              │  │              │
│ Temp: 0.2      │  │ Temp: 0.2    │  │ Temp: 0.3    │
│ Store: false   │  │ Store: false │  │ Store: false │
└────────────────┘  └──────────────┘  └──────────────┘

┌────────────────────────────────────────────────────────────────┐
│              General Problem Solver                             │
│        (Complex Model: gpt-5-think by default)                  │
│                                                                  │
│  Tools: ALL (ha_search, ha_call, memory, web_search)            │
│  Temperature: 0.5 (creative)                                     │
│  Reasoning Effort: High (if supported)                           │
│  Store: true                                                     │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Agent Specializations

#### **Orchestrator Agent**
- **Model**: Fast (gpt-5-nano)
- **Role**: Routes to specialists, ensures polished responses
- **Handoffs**: Can delegate to any of 4 specialists
- **Instructions**:
  - Understand request and decide: answer directly or delegate
  - Smart home → Home Control Specialist
  - Long-term memory → Memory Specialist
  - Research/news → Research Specialist
  - Multi-domain → General Problem Solver

#### **Home Control Specialist**
- **Model**: Fast (gpt-5-nano)
- **Tools**: `ha_search`, `ha_call`
- **Instructions**:
  - Search entities with ha_search before calling ha_call
  - Verify outcomes using returned data
  - Explain failures clearly

#### **Memory Specialist**
- **Model**: Fast (gpt-5-nano)
- **Tools**: `memory_search`, `memory_add`
- **Instructions**:
  - Search memories before responding
  - Only store user-confirmed preferences
  - Never fabricate memories

#### **Research Specialist**
- **Model**: Balanced (gpt-5-mini)
- **Tools**: `web_search`, `memory_search`
- **Instructions**:
  - Use web_search for current information
  - Mention sources/URLs in summaries
  - Explain API failures

#### **General Problem Solver**
- **Model**: Complex (gpt-5-think)
- **Tools**: ALL (ha_search, ha_call, memory, web_search)
- **Instructions**:
  - Handle multi-step reasoning
  - Decide which tools to use
  - Verify smart home actions
  - Include tool usage in summaries

### 3.3 Guardrails

**Input Guardrail** (`sanitizeInputGuardrail`):
- Normalizes input text
- Handles text + image inputs
- Returns length metadata

**Output Guardrail** (`outputQualityGuardrail`):
- Checks final output quality
- Verifies punctuation
- Returns quality metrics

---

## 4. Tools System

### 4.1 Available Tools

| Tool | Description | Implementation | External Service |
|------|-------------|----------------|------------------|
| **ha_search** | Search Home Assistant entities/areas | tools-improved.ts | Home Assistant API |
| **ha_call** | Control HA devices | tools-improved.ts | Home Assistant API |
| **memory_add** | Store persistent memories | tools.ts | Supabase + OpenAI Embeddings |
| **memory_search** | Search memories by keyword | tools.ts | Supabase + OpenAI Embeddings |
| **web_search** | Search web (Tavily or DuckDuckGo) | tools.ts | Tavily API / DuckDuckGo |

### 4.2 Tool Details

#### **ha_search** (Home Assistant Search)

**File**: `apps/web/src/lib/agent/tools-improved.ts:76-204`

**Features**:
- ✅ Fuzzy search with scoring (exact, starts with, contains, word matches)
- ✅ Domain filtering (light, switch, climate, etc.)
- ✅ Area search support
- ✅ 5-second cache (reduces API calls)
- ✅ 5-second timeout (prevents hanging)

**Parameters**:
```typescript
{
  query: string;        // "living room lights"
  domain: string | null; // "light", "switch", etc.
  limit: number;        // Default: 10, Max: 50
}
```

**Returns**:
```json
{
  "entities": [
    {
      "entity_id": "light.living_room_ceiling",
      "friendly_name": "Living Room Ceiling Light",
      "state": "on",
      "domain": "light",
      "area": "Living Room",
      "score": 95
    }
  ],
  "areas": [
    {
      "area_id": "living_room",
      "name": "Living Room",
      "score": 100
    }
  ]
}
```

**Scoring Algorithm**:
- Exact match: 100 points
- Starts with: 90 points
- Contains as whole word: 80 points
- Contains: 70 points
- Word matches: 50-70 points

---

#### **ha_call** (Home Assistant Service Call)

**File**: `apps/web/src/lib/agent/tools-improved.ts:207-337`

**Features**:
- ✅ Service execution (turn_on, turn_off, set_temperature, etc.)
- ✅ Multiple targeting modes (entity_id, area_id, or both)
- ✅ State verification (checks if action succeeded)
- ✅ Cache invalidation (clears after state changes)
- ✅ 10-second timeout

**Parameters**:
```typescript
{
  domain: string;             // "light", "switch", "climate"
  service: string;            // "turn_on", "turn_off", "toggle"
  entity_id: string | string[] | null;
  area_id: string | string[] | null;
  data: Record<string, string | number | boolean> | null;
}
```

**Example Call**:
```typescript
{
  domain: "light",
  service: "turn_on",
  entity_id: "light.living_room",
  data: { brightness: 255 }
}
```

**Returns with Verification**:
```json
{
  "ok": true,
  "message": "Successfully called light.turn_on",
  "verification": [
    {
      "entity_id": "light.living_room",
      "current_state": "on",
      "expected_state": "on",
      "verified": true
    }
  ]
}
```

---

#### **memory_add** (Store Memory)

**File**: `apps/web/src/lib/agent/tools.ts:162-196`

**Features**:
- ✅ Persistent storage in Supabase
- ✅ Vector embeddings (OpenAI text-embedding-3-small)
- ✅ Tag support for categorization
- ⚠️ User isolation (fixed in Session #6)

**Parameters**:
```typescript
{
  content: string;      // Single sentence fact
  tags: string[] | null; // ["preference", "home"]
}
```

**Process**:
1. Generate embedding with OpenAI
2. Insert into Supabase `memories` table
3. Return memory ID

---

#### **memory_search** (Search Memories)

**File**: `apps/web/src/lib/agent/tools.ts:199-249`

**Features**:
- ✅ Semantic search using vector embeddings
- ✅ Similarity threshold (0.7 by default)
- ✅ User-specific results (fixed in Session #6)
- ✅ Relevance scoring

**Parameters**:
```typescript
{
  query: string;   // "user preferences"
  top_k: number;   // Default: 5, Max: 50
}
```

**Returns**:
```json
{
  "results": [
    {
      "id": "mem_123",
      "content": "User prefers lights at 80% brightness in evening",
      "tags": ["preference", "lighting"],
      "score": 0.92,
      "created_at": "2025-10-30T12:00:00Z"
    }
  ]
}
```

**Database Function**: Uses Supabase RPC `match_memories` (vector similarity search)

---

#### **web_search** (Web Search)

**File**: `apps/web/src/lib/agent/tools.ts:252-304`

**Features**:
- ✅ Tavily API (primary, requires TAVILY_API_KEY)
- ✅ DuckDuckGo fallback (no API key needed)
- ✅ Configurable result limit

**Parameters**:
```typescript
{
  query: string;        // "latest AI news"
  max_results: number;  // Default: 5, Max: 10
}
```

**Returns (Tavily)**:
```json
{
  "answer": "Quick summary of results...",
  "results": [
    {
      "title": "Article Title",
      "url": "https://example.com",
      "snippet": "Preview text..."
    }
  ]
}
```

---

### 4.3 Tool Loading Strategy

**File**: `smart-stream/route.ts:216-239`

**Priority**:
1. Try loading `tools-improved.ts` (enhanced features)
2. Fallback to `tools.ts` (basic implementation)

**Differences**:
- **tools-improved.ts**: Better search scoring, caching, verification
- **tools.ts**: Basic functionality, simpler implementation

---

## 5. Frontend Integration

### 5.1 Agent Page Component

**File**: `apps/web/src/app/(main)/agent/page.tsx` (3000+ lines)

**Key Features**:
- ✅ **Thread management** (create, switch, delete)
- ✅ **Message caching** (avoids redundant API calls)
- ✅ **Streaming responses** (SSE with delta updates)
- ✅ **Voice input** (Whisper API transcription)
- ✅ **Text-to-speech** (browser Speech Synthesis API)
- ✅ **File uploads** (images for vision API)
- ✅ **Share target** (PWA integration)
- ✅ **Thread organization** (folders, tags, pinned, archived)

### 5.2 State Management

**Local State** (useState):
```typescript
threads: Thread[]           // All chat threads
activeThreadId: string      // Current thread
messages: Message[]         // Current thread messages
input: string               // User input text
files: File[]               // Uploaded files
loading: boolean            // API call in progress
streamingContent: string    // Partial SSE response
messageCache: Record<string, Message[]> // Performance optimization
```

**Performance Optimizations**:
- **Message caching** (line 72): Avoids reloading messages on thread switch
- **Request deduplication** (line 74-75): Cancels in-flight requests
- **Abort controllers** (line 286-293): Prevents race conditions

### 5.3 Streaming Response Handling

**Code**: `agent/page.tsx:540-650`

```typescript
// Connect to SSE endpoint
const response = await fetch('/api/agent/smart-stream', {
  method: 'POST',
  body: JSON.stringify({
    input_as_text: userContent,
    images: base64Images,
    thread_id: currentThreadId,
    model: activeThread?.model,
    enabled_tools: activeThread?.enabledTools,
  }),
});

// Parse SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const json = JSON.parse(line.slice(6));

      if (json.metadata) {
        // Store metadata (model, complexity, tools)
        setStreamingMeta(json.metadata);
      }

      if (json.delta) {
        // Append partial response
        setStreamingContent(prev => prev + json.delta);
      }

      if (json.done) {
        // Finalize message
        const finalContent = json.content;
        // Save to database + update UI
      }

      if (json.error) {
        // Handle error
        toast.error(json.error);
      }
    }
  }
}
```

### 5.4 Lazy-Loaded Modals

**Code**: `agent/page.tsx:18-24`

**Components**:
- `ThreadOptionsMenu` - Edit thread settings (model, tools, tags)
- `TTSSettingsModal` - Configure text-to-speech
- `AgentMemoryModal` - View/manage agent memories
- `UserMemoriesModal` - View/manage user memories

**Performance**: Uses `dynamic()` import to avoid loading unless opened

---

## 6. Database Schema

### 6.1 Tables Used by Agent

#### **chat_threads**
```sql
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Organization
  tags TEXT[] DEFAULT '{}',
  folder TEXT,
  pinned BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,

  -- Agent Configuration
  model TEXT DEFAULT 'gpt-5-mini',
  agent_style TEXT DEFAULT 'balanced',
  agent_name TEXT,
  enabled_tools TEXT[] DEFAULT '{home_assistant,memory,web_search}',
  project_context TEXT
);
```

#### **chat_messages**
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Optional metadata
  file_urls TEXT[],
  tool_calls JSONB,
  execution_time_ms INTEGER
);
```

#### **memories**
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity function
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  user_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  tags TEXT[],
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.tags,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM memories m
  WHERE m.user_id = user_id
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### **agent_memories**
```sql
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users, -- User isolation (Session #6)
  agent_name TEXT NOT NULL DEFAULT 'FROK Assistant',
  memory_type TEXT NOT NULL, -- 'core', 'facts', 'context', etc.
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Security & Performance

### 7.1 Security Improvements (Session #6)

**Before Session #6**:
- ❌ No authentication on agent routes
- ❌ No rate limiting (AI abuse risk)
- ❌ Shared agent memories (privacy issue)
- ❌ Test endpoints publicly accessible

**After Session #6**:
- ✅ All routes require authentication (`withAuth`)
- ✅ Rate limiting on AI routes (5 req/min)
- ✅ User-specific agent memories
- ✅ Test endpoints environment-gated

**Middleware Stack**:
```typescript
export async function POST(req: NextRequest) {
  // 1. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 2. Rate Limiting
  const rateLimit = await withRateLimit(req, rateLimitPresets.ai);
  if (!rateLimit.ok) return rateLimit.response;

  // 3. Thread Verification (user isolation)
  const { data: thread } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('id', threadId)
    .eq('user_id', auth.user.userId)
    .single();

  if (!thread) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // 4. Business logic...
}
```

### 7.2 Performance Optimizations

**Frontend**:
- ✅ Message caching (avoids redundant API calls)
- ✅ Request deduplication (abort controllers)
- ✅ Lazy-loaded modals (code splitting)
- ✅ Abort on unmount (prevents memory leaks)

**Backend**:
- ✅ Home Assistant cache (5-second TTL)
- ✅ Conversation history limit (last 20 messages)
- ✅ Request timeouts (5-10 seconds)
- ✅ Streaming responses (SSE, not polling)

**Database**:
- ✅ Vector indexes on embeddings
- ✅ Indexes on user_id, thread_id
- ✅ Cascade deletes (cleanup)

---

## 8. Environment Variables

### 8.1 Required Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Model Configuration
OPENAI_FAST_MODEL=gpt-5-nano         # Simple queries
OPENAI_GENERAL_MODEL=gpt-5-mini      # Moderate queries
OPENAI_AGENT_MODEL=gpt-5-think       # Complex queries
OPENAI_ROUTER_MODEL=gpt-5-nano       # Orchestrator routing
OPENAI_HOME_MODEL=gpt-5-nano         # Home control specialist
OPENAI_MEMORY_MODEL=gpt-5-nano       # Memory specialist
OPENAI_RESEARCH_MODEL=gpt-5-mini     # Research specialist

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Home Assistant (Optional)
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=eyJ...

# Web Search (Optional)
TAVILY_API_KEY=tvly-...  # If not set, falls back to DuckDuckGo

# Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 8.2 Optional Overrides

**User Model Preference** (thread settings):
- Overrides complexity classification
- Options: `gpt-5-nano`, `gpt-5-mini`, `gpt-5-think`, `gpt-5`

**Enabled Tools** (thread settings):
- Default: `['home_assistant', 'memory', 'web_search']`
- Can be customized per thread

---

## 9. File Structure & Responsibilities

```
apps/web/src/
├── app/
│   ├── (main)/
│   │   └── agent/
│   │       └── page.tsx                    # Frontend: Chat UI (3000+ lines)
│   │
│   └── api/
│       ├── agent/
│       │   ├── smart-stream/route.ts       # Main endpoint (412 lines)
│       │   ├── stream/route.ts             # Basic streaming
│       │   ├── run/route.ts                # Synchronous execution
│       │   ├── classify/route.ts           # Query classification
│       │   ├── memory/route.ts             # Agent memory CRUD
│       │   ├── config/route.ts             # Configuration
│       │   ├── test/route.ts               # Testing (dev-only)
│       │   └── ha-test/route.ts            # HA testing (dev-only)
│       │
│       ├── chat/
│       │   ├── threads/route.ts            # Thread CRUD
│       │   └── messages/route.ts           # Message CRUD
│       │
│       └── memory/
│           ├── add/route.ts                # User memory add
│           ├── search/route.ts             # User memory search
│           └── list/route.ts               # User memory list
│
├── lib/
│   ├── agent/
│   │   ├── orchestrator.ts                 # Multi-agent coordinator (277 lines)
│   │   ├── tools-improved.ts               # Enhanced tools (341 lines)
│   │   ├── tools.ts                        # Basic tools (305 lines)
│   │   ├── runWorkflow.ts                  # Workflow runner (39 lines)
│   │   ├── runWorkflow-simple.ts           # Simplified workflow
│   │   └── runWorkflow-ha-only.ts          # HA-only workflow
│   │
│   └── api/
│       ├── withAuth.ts                     # Authentication middleware
│       ├── withRateLimit.ts                # Rate limiting middleware
│       ├── withValidation.ts               # Request validation
│       └── withErrorHandler.ts             # Error handling
│
├── components/
│   ├── MessageContent.tsx                  # Message rendering
│   ├── SuggestedPrompts.tsx                # Quick actions
│   ├── QuickActions.tsx                    # Action chips
│   ├── ThreadOptionsMenu.tsx               # Thread settings modal
│   ├── TTSSettings.tsx                     # TTS configuration
│   ├── AgentMemoryModal.tsx                # Agent memory viewer
│   └── UserMemoriesModal.tsx               # User memory viewer
│
├── hooks/
│   ├── useVoiceRecorder.ts                 # Voice input (Whisper)
│   ├── useTextToSpeech.ts                  # TTS output
│   └── queries/
│       ├── useChat.ts                      # TanStack Query for chat
│       └── useMemories.ts                  # TanStack Query for memories
│
├── schemas/
│   ├── agent.ts                            # Agent validation schemas
│   ├── chat.ts                             # Chat validation schemas
│   └── memory.ts                           # Memory validation schemas
│
└── types/
    └── database.ts                         # Database type definitions
```

---

## 10. Recent Work & Normalization

### 10.1 Session #4-6 Improvements

**Phase 1: Critical Fixes**
- ✅ Zustand stores (chat, TTS, user preferences)
- ✅ Component deduplication (removed Toast, SideNav duplicates)
- ✅ Error handling standardization

**Phase 2: Security & Type Safety**
- ✅ Authentication on ALL agent routes
- ✅ Finance type safety (eliminated `any` types)
- ✅ Request validation (Zod schemas)
- ✅ Rate limiting (5 req/min on AI routes)

**Phase 3-4: UI/UX & Architecture**
- ✅ Button component standardization
- ✅ TanStack Query hooks (useMemories, useChat)
- ✅ URL state management
- ✅ Utility functions

**Session #6: Agent Routes Security**
- ✅ 8/8 agent routes authenticated
- ✅ 5/8 agent routes rate limited
- ✅ User isolation for agent memories
- ✅ Test endpoints environment-gated

### 10.2 Session #7: TypeScript Compilation

**Problem**: 32+ TypeScript errors blocking production deployments

**Solution**: Fixed all compilation errors
- ✅ Request body typing (explicit types instead of `unknown`)
- ✅ Index signature bracket notation
- ✅ Early return for type narrowing
- ✅ Null/undefined compatibility

**Impact**: Clean production builds on Vercel

---

## 11. Future Improvements

### 11.1 Planned Enhancements

1. **Agent Performance**
   - Implement response caching for common queries
   - Add conversation summarization for long threads
   - Optimize embedding generation (batch processing)

2. **Tool Expansion**
   - Add calendar integration (Google Calendar, Outlook)
   - Add email tools (Gmail, Outlook)
   - Add file system tools (read/write documents)
   - Add database query tools (SQL)

3. **Orchestrator Enhancements**
   - Add cost tracking per agent execution
   - Implement agent performance metrics
   - Add user feedback loop for agent selection

4. **UI/UX Improvements**
   - Add real-time typing indicators
   - Implement message reactions
   - Add thread search/filtering UI
   - Add agent configuration wizard

5. **Testing & Monitoring**
   - E2E tests for agent flows
   - Performance monitoring (latency, token usage)
   - Error rate tracking
   - User satisfaction metrics

---

## 12. Key Takeaways

### 12.1 Strengths

✅ **Well-Architected**:
- Clear separation of concerns (orchestrator, agents, tools)
- Modular design (easy to add new tools/agents)
- Type-safe (TypeScript throughout)

✅ **Production-Ready**:
- Authentication & authorization
- Rate limiting for cost control
- Error handling & logging
- User isolation & privacy

✅ **Feature-Rich**:
- Multi-modal input (text + images)
- Streaming responses (SSE)
- Voice input/output (Whisper + TTS)
- Thread organization (folders, tags, pinned)

✅ **Performance-Optimized**:
- Request caching (HA, messages)
- Request deduplication (abort controllers)
- Code splitting (lazy-loaded modals)

### 12.2 Architecture Highlights

1. **Smart Routing**: Query classification → model selection → orchestrator vs. direct
2. **Multi-Agent System**: 5 specialized agents + 1 orchestrator
3. **Tool Integration**: 5 powerful tools (HA, Memory, Web Search)
4. **Streaming Responses**: SSE for real-time feedback
5. **User Isolation**: All data scoped to authenticated user

### 12.3 Code Quality

- **TypeScript Coverage**: 100% (no implicit `any` types)
- **Authentication**: 100% of routes protected
- **Rate Limiting**: AI routes limited to 5 req/min
- **Testing**: E2E tests pending (see Session #8)
- **Documentation**: Comprehensive (CLAUDE.md + this doc)

---

## 13. Quick Reference

### 13.1 Common User Flows

**Flow 1: Simple Command (e.g., "Turn on lights")**
```
User Input → smart-stream → classifyQuery('simple') → gpt-5-nano
  → Direct Agent → ha_search → ha_call → Stream Response
```

**Flow 2: Complex Query (e.g., "Analyze my energy usage and suggest optimizations")**
```
User Input → smart-stream → classifyQuery('complex') → gpt-5-think
  → Orchestrator → General Problem Solver → ha_search + memory_search
  → Orchestrator (final summary) → Stream Response
```

**Flow 3: Research Query (e.g., "What's the latest AI news?")**
```
User Input → smart-stream → classifyQuery('moderate') → gpt-5-mini
  → Orchestrator → Research Specialist → web_search
  → Orchestrator (final summary) → Stream Response
```

### 13.2 Debugging Tips

1. **Check Logs**: All tools log to console (`[ha_search]`, `[ha_call]`, etc.)
2. **Verify Config**: `/api/agent/config` returns model names
3. **Test Tools**: Use `/api/agent/ha-test` (dev only)
4. **Inspect Streaming**: Browser DevTools → Network → SSE responses
5. **Check Auth**: Verify `withAuth` returns valid user

### 13.3 Adding a New Tool

**Step 1**: Create tool in `tools-improved.ts`
```typescript
export const myNewTool = tool({
  name: 'my_tool',
  description: 'What this tool does',
  parameters: z.object({ /* ... */ }),
  async execute({ param1, param2 }) {
    // Tool logic
    return JSON.stringify({ ok: true, data: result });
  },
});
```

**Step 2**: Add to orchestrator agents (`orchestrator.ts`)
```typescript
const mySpecialistAgent = new Agent({
  name: 'My Specialist',
  tools: [tools.myNewTool],
  // ...
});
```

**Step 3**: Update tool map in `smart-stream/route.ts`
```typescript
const toolMap = {
  my_tool: toolset.myNewTool,
  // ...
};
```

**Step 4**: Add to thread enabled_tools default
```typescript
enabledTools: ['home_assistant', 'memory', 'web_search', 'my_tool']
```

---

## Appendix A: Related Documentation

- `CLAUDE.md` - Project overview and coding standards
- `NORMALIZATION_PLAN.md` - Normalization roadmap
- `AGENT_ROUTES_SECURITY_AUDIT.md` - Security audit report (Session #6)
- `SESSION_7_SUMMARY.md` - TypeScript compilation fixes
- `TESTING.md` - Testing framework and E2E tests

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-11-01
**Next Review**: After major agent system changes
