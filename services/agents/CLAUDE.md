# services/agents - AI Agent Orchestration Context

**Purpose**: Domain-specific patterns for OpenAI Agents SDK orchestration, tools, and responses.

> 📚 **Parent Context**: See [root CLAUDE.md](../../CLAUDE.md) for project-wide standards
> 📖 **Full Docs**: See [services/agents/README.md](README.md) for complete agent system overview

---

## Agent System Architecture

```
User Query → Router Agent → [Specialized Agent] → Tools → Response
                              ├─ Home Control Specialist
                              ├─ Memory Specialist
                              ├─ Research Specialist
                              ├─ Code Execution Specialist
                              └─ General Problem Solver
```

**6 Specialized Agents** with appropriate tools and guardrails for each domain.

---

## Key Locations

```
services/agents/
└── (Agent system implemented in apps/web for now)
    └── apps/web/src/lib/agent/
        ├── orchestrator-enhanced.ts    # 6-agent orchestration
        ├── tools-unified.ts            # 11 tools (6 built-in + 5 custom)
        ├── responseSchemas.ts          # 6 structured output types
        ├── guardrails.ts               # 9 safety/quality guardrails
        └── tools-improved.ts           # Legacy tool system

apps/web/src/app/api/agent/
├── smart-stream-enhanced/route.ts     # Production route with all features
├── smart-stream/route.ts              # Original route
├── memory/route.ts                    # Agent memory management
├── classify/route.ts                  # Query complexity classification
└── suggestions/route.ts               # Context-aware prompt suggestions
```

---

## Agent Orchestration Patterns

### Creating an Agent Suite

```typescript
import { createAgentSuite } from '@/lib/agent/orchestrator-enhanced';
import { getAgentTools } from '@/lib/agent/tools-unified';
import { buildGuardrails } from '@/lib/agent/guardrails';

// Create specialized agent
const suite = await createAgentSuite({
  agentType: 'research',           // or 'home', 'memory', 'code', 'general'
  userContext: {
    userId: user.id,
    preferences: {},
  },
  enableStructuredOutputs: true,   // Recommended for type safety
  enableGuardrails: true,           // Recommended for safety
});

// Run agent
const result = await suite.run({
  input: userQuery,
  tools: getAgentTools('research'),
  guardrails: buildGuardrails('research'),
});
```

### Agent Types and Their Tools

**1. Home Control Specialist**:
- Tools: `ha_search`, `ha_call`
- Use for: Device control, automation, Home Assistant operations
- Guardrails: Home Assistant safety (prevents dangerous actions)

**2. Memory Specialist**:
- Tools: `memory_add`, `memory_search`
- Use for: Long-term memory management, knowledge retrieval
- Guardrails: Content filter, information leakage prevention

**3. Research Specialist**:
- Tools: `web_search`, `file_search`
- Use for: Web research, document search, information gathering
- Guardrails: Output quality, information leakage prevention

**4. Code Execution Specialist**:
- Tools: `code_interpreter`, `web_search`
- Use for: Python code execution, data analysis, computations
- Guardrails: Cost limit, output quality

**5. General Problem Solver**:
- Tools: All 11 tools available
- Use for: Multi-domain tasks, complex problems
- Guardrails: All 9 guardrails active

**6. FROK Orchestrator** (Router):
- Routes queries to appropriate specialist
- Analyzes complexity and selects optimal model

---

## Tools System

### Built-in OpenAI Tools (6)

```typescript
const builtInTools = [
  'web_search',         // OpenAI managed web search (no API key needed)
  'file_search',        // Vector store document search ($0.10/GB/day)
  'code_interpreter',   // Python sandbox ($0.03/session)
  'computer_use',       // Desktop automation (experimental)
  'image_generation',   // DALL-E ($0.040 per 1024x1024)
  'hosted_mcp',         // Model Context Protocol (experimental)
];
```

### Custom Tools (5)

```typescript
// 1. Home Assistant Search
{
  name: 'ha_search',
  description: 'Search Home Assistant devices',
  parameters: { query: string },
}

// 2. Home Assistant Call
{
  name: 'ha_call',
  description: 'Control Home Assistant devices',
  parameters: { domain, service, entity_id, data },
}

// 3. Memory Add
{
  name: 'memory_add',
  description: 'Store persistent memory',
  parameters: { content, tags, memory_type },
}

// 4. Memory Search
{
  name: 'memory_search',
  description: 'Search semantic memories',
  parameters: { query, limit, tags },
}

// 5. Custom Web Search
{
  name: 'custom_web_search',
  description: 'Tavily/DuckDuckGo fallback',
  parameters: { query, max_results },
}
```

### Tool Configuration

```typescript
import { getToolConfiguration, recommendTools } from '@/lib/agent/tools-unified';

// Get all available tools
const allTools = getToolConfiguration();

// Get tools for specific agent type
const researchTools = getAgentTools('research');

// Recommend tools based on query
const recommendedTools = recommendTools('Search for information about AI');
// Returns: ['web_search', 'file_search']
```

---

## Structured Outputs

### Response Schemas (6 types)

```typescript
import { selectResponseSchema, parseStructuredOutput } from '@/lib/agent/responseSchemas';

// Automatically select schema based on query and tools
const schema = selectResponseSchema(query, toolsUsed);

// Parse agent output with validation
const parsed = parseStructuredOutput(agentOutput, schema);
if (parsed.ok) {
  const response = parsed.data; // Type-safe response
}
```

**Schema Types**:
1. **ResearchResponse**: Sources, findings, confidence scores
2. **SmartHomeResponse**: Device actions, state verification
3. **MemoryResponse**: Retrieved/added memories with relevance
4. **CodeResponse**: Execution results, outputs, errors
5. **OrchestrationResponse**: Agent handoffs, reasoning
6. **ErrorResponse**: Structured error handling

**Benefits**:
- 100% schema adherence guaranteed
- Type-safe responses
- Consistent format across agents
- Automatic validation

---

## Guardrails System

### Input Guardrails (3)

```typescript
// 1. Sanitize Input
{
  name: 'sanitizeInputGuardrail',
  checks: ['length', 'whitespace', 'normalization'],
  maxLength: 10000,
}

// 2. Content Filter
{
  name: 'contentFilterGuardrail',
  detects: ['PII', 'credit cards', 'API keys', 'SSN'],
  action: 'reject',
}

// 3. Prompt Injection Detection
{
  name: 'promptInjectionGuardrail',
  patterns: ['ignore previous', 'system:', 'new instructions'],
  action: 'reject',
}
```

### Output Guardrails (4)

```typescript
// 1. Output Quality
{
  name: 'outputQualityGuardrail',
  checks: ['length', 'punctuation', 'capitalization'],
  minLength: 10,
}

// 2. Home Assistant Safety
{
  name: 'homeAssistantSafetyGuardrail',
  blocked: ['unlock', 'disarm', 'garage_open', 'door_open'],
  action: 'reject',
}

// 3. Cost Limit
{
  name: 'costLimitGuardrail',
  maxCost: 0.50, // per request
  action: 'reject',
}

// 4. Information Leakage
{
  name: 'informationLeakageGuardrail',
  detects: ['API keys', 'passwords', 'tokens', 'env vars'],
  action: 'redact',
}
```

### Using Guardrails

```typescript
import { buildGuardrails } from '@/lib/agent/guardrails';

// Get appropriate guardrails for agent type
const guardrails = buildGuardrails('home'); // Returns home-specific guardrails

// Manual guardrail application
import { sanitizeInputGuardrail, outputQualityGuardrail } from '@/lib/agent/guardrails';

const sanitized = sanitizeInputGuardrail(userInput);
if (!sanitized.ok) {
  return { error: sanitized.error };
}

const quality = outputQualityGuardrail(agentOutput);
if (!quality.ok) {
  return { error: quality.error };
}
```

---

## Response Caching

### Intelligent Caching Strategy

```typescript
import { agentCache } from '@/lib/cache/agentCache';

// Check cache before agent execution
const cacheKey = agentCache.getCacheKey(query, userId);
const cached = agentCache.get(cacheKey);
if (cached) {
  return cached; // 0ms latency, $0 cost
}

// After agent execution, cache response
agentCache.set(cacheKey, response, {
  complexity: 'simple',    // TTL: 10 minutes
  tools: ['web_search'],
  threadId,
});
```

**Cacheability Rules**:
- ❌ Skip if query contains: "now", "today", "current", "latest"
- ❌ Skip if query is action command: "turn on", "set", "change"
- ❌ Skip if using dynamic tools: `code_interpreter`, `computer_use`, `memory_add`
- ✅ Cache simple queries: 10 minutes
- ✅ Cache moderate queries: 5 minutes
- ✅ Cache complex queries: 2 minutes

**Expected Impact**: 30-50% cost reduction on repeated queries

---

## Model Selection

### Reasoning Models

```typescript
import { supportsReasoning } from '@/lib/agent/orchestrator-enhanced';

if (supportsReasoning(modelName)) {
  // Use reasoning effort configuration
  config.reasoningEffort = 'medium'; // 'low' | 'medium' | 'high'
}
```

**Reasoning-capable models**: `gpt-5`, `o3`, `gpt-4.1-reasoning`

### Model Configuration by Agent

- **Router**: `gpt-5` (needs reasoning for routing decisions)
- **Home**: `gpt-5-mini` (simple device control)
- **Memory**: `gpt-5-mini` (semantic search)
- **Research**: `gpt-5-mini` (web search)
- **Code**: `gpt-5-think` (complex code execution)
- **General**: `gpt-5` (multi-domain tasks)

**Environment Variables**:
```bash
OPENAI_MODEL_ROUTER=gpt-5
OPENAI_MODEL_HOME=gpt-5-mini
OPENAI_MODEL_MEMORY=gpt-5-mini
OPENAI_MODEL_RESEARCH=gpt-5-mini
OPENAI_MODEL_CODE=gpt-5-think
OPENAI_MODEL_GENERAL=gpt-5
```

---

## Common Patterns

### Query Classification

```typescript
import { classifyQuery } from '@/lib/agent/classifier';

const classification = classifyQuery(query);
// Returns: { complexity: 'simple' | 'moderate' | 'complex', confidence: 0-1 }

// Use classification for model selection
const model = classification.complexity === 'complex' ? 'gpt-5' : 'gpt-5-mini';
```

### Streaming Responses

```typescript
// API route with streaming
export async function POST(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of agentRunner.stream()) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### Error Handling

```typescript
try {
  const result = await agent.run(input);
  return { ok: true, data: result };
} catch (error: unknown) {
  // Use structured error schema
  const errorResponse: ErrorResponse = {
    type: 'error',
    error_code: 'AGENT_EXECUTION_FAILED',
    message: error instanceof Error ? error.message : 'Unknown error',
    recovery_suggestions: ['Try again', 'Simplify your query'],
  };
  return { ok: false, error: errorResponse };
}
```

---

## Testing Agent Interactions

```typescript
// Unit test example
import { describe, it, expect } from 'vitest';
import { createAgentSuite } from '@/lib/agent/orchestrator-enhanced';

describe('Agent Orchestration', () => {
  it('should route simple queries to mini model', async () => {
    const suite = await createAgentSuite({ agentType: 'research' });
    const result = await suite.run({ input: 'What is AI?' });
    expect(result.model).toBe('gpt-5-mini');
  });
});
```

---

## Quick Commands

```bash
# Development (run from monorepo root)
pnpm dev                  # Starts web app with agent routes

# Testing
pnpm test                 # Unit tests
pnpm test:e2e             # E2E tests including agent interactions

# Type Checking
pnpm typecheck            # Must pass before commits
```

---

**Note**: This file provides agent-specific patterns. For API route patterns (auth, validation, rate limiting), see [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md).
