# FROK Agents

AI agent orchestration services powered by OpenAI Agents SDK.

## Overview

FROK's agent system is a **sophisticated multi-agent orchestration platform** featuring:

- 🤖 **6 Specialized Agents** - Router, Home Control, Memory, Research, Code Execution, General Problem Solver
- 🛠️ **11 Powerful Tools** - 6 OpenAI built-in + 5 custom integrations
- 🔄 **Smart Routing** - Query complexity classification and dynamic model selection
- 📡 **Streaming Responses** - Real-time Server-Sent Events (SSE)
- 🔒 **Security-First** - Authentication, rate limiting, user isolation

## Architecture

```
User Query → Router Agent → [Specialized Agent] → Tools → Response
                              ├─ Home Control
                              ├─ Memory
                              ├─ Research
                              ├─ Code Execution
                              └─ General Problem Solver
```

## Agent Specializations

### 1. Router Agent (Orchestrator)
Routes queries to appropriate specialized agents based on intent and complexity.

### 2. Home Control Specialist
Handles Home Assistant device control and automation.

**Tools**: `ha_search`, `ha_call`

### 3. Memory Specialist
Manages persistent memories and knowledge base.

**Tools**: `memory_add`, `memory_search`

### 4. Research Specialist
Performs web research with citations.

**Tools**: `web_search`, `file_search`

### 5. Code Execution Specialist
Executes Python code in sandbox environment.

**Tools**: `code_interpreter`, `web_search`

### 6. General Problem Solver
Multi-domain problem solving with all available tools.

**Tools**: All 11 tools available

## Tools

### Built-in OpenAI Tools (6)
1. `web_search` - OpenAI managed web search
2. `file_search` - Vector store document search
3. `code_interpreter` - Python sandbox execution
4. `computer_use` - Desktop automation (experimental)
5. `image_generation` - DALL-E integration
6. `hosted_mcp` - Model Context Protocol (experimental)

### Custom Tools (5)
1. `ha_search` - Home Assistant device search
2. `ha_call` - Home Assistant device control
3. `memory_add` - Store persistent memories
4. `memory_search` - Semantic memory search
5. `custom_web_search` - Tavily/DuckDuckGo fallback

## Development

```bash
# Build agents service
pnpm -F @frok/agents build

# Run in development
pnpm -F @frok/agents dev

# Type check
pnpm -F @frok/agents typecheck
```

## Configuration

Environment variables:

```bash
# OpenAI
OPENAI_API_KEY=

# Model Selection
OPENAI_MODEL_ROUTER=gpt-5
OPENAI_MODEL_HOME=gpt-5-mini
OPENAI_MODEL_MEMORY=gpt-5-mini
OPENAI_MODEL_RESEARCH=gpt-5-mini
OPENAI_MODEL_CODE=gpt-5-think
OPENAI_MODEL_GENERAL=gpt-5

# Home Assistant
HOME_ASSISTANT_URL=
HOME_ASSISTANT_TOKEN=
```

## Code Location

- **Orchestrator**: `apps/web/src/lib/agent/orchestrator-enhanced.ts`
- **Tools**: `apps/web/src/lib/agent/tools-unified.ts`
- **API Routes**: `apps/web/src/app/api/agent/*`
- **Guardrails**: `apps/web/src/lib/agent/guardrails.ts`
- **Response Schemas**: `apps/web/src/lib/agent/responseSchemas.ts`

## Features

### Structured Outputs
6 specialized response types with Zod validation:
- ResearchResponse
- SmartHomeResponse
- MemoryResponse
- CodeResponse
- OrchestrationResponse
- ErrorResponse

### Guardrails
9 total guardrails for safety and quality:
- **Input**: sanitization, content filter, prompt injection detection
- **Output**: quality, Home Assistant safety, cost limit, information leakage

### Response Caching
Intelligent caching with 30-50% cost reduction:
- Query normalization
- Complexity-based TTL (2-10 minutes)
- Smart cacheability detection

## Documentation

See comprehensive documentation at:

- **[docs/AGENTS.md](../../docs/AGENTS.md)** - Navigation hub
- **[docs/architecture/AGENT_SYSTEM_ANALYSIS.md](../../docs/architecture/AGENT_SYSTEM_ANALYSIS.md)** - Detailed architecture
- **[docs/architecture/AGENT_ROUTES_SECURITY_AUDIT.md](../../docs/architecture/AGENT_ROUTES_SECURITY_AUDIT.md)** - Security audit
- **[docs/roadmaps/OPENAI_IMPROVEMENTS_ROADMAP.md](../../docs/roadmaps/OPENAI_IMPROVEMENTS_ROADMAP.md)** - Enhancement roadmap

## See Also

- [OpenAI Agents Documentation](https://platform.openai.com/docs/guides/agents)
- [Session #10: OpenAI Agent Upgrade](../../CLAUDE.md#session-10) (in CLAUDE.md)
