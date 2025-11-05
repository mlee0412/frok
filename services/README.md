# services

Long-running and domain-specific services for the FROK platform.

## Services Overview

### 1. agents/
AI agent orchestration services powered by OpenAI Agents SDK.

**Features**:
- Multi-agent orchestration (6 specialized agents)
- 11 tools (6 built-in + 5 custom)
- Smart routing and complexity classification
- Streaming responses with SSE

**Documentation**: [docs/AGENTS.md](../docs/AGENTS.md)

### 2. mcp/
Model Context Protocol (MCP) servers for external service integration.

**Available Servers**:
- `github/` - GitHub integration
- `google/` - Google services (Calendar, Gmail)
- `home-assistant/` - Home Assistant automation
- `square/` - Square payment processing

**Documentation**: See individual server directories

---

## Development

Each service has its own configuration and build process.

### Building All Services
```bash
pnpm build
```

### Running a Specific Service
```bash
pnpm -F @frok/agents dev
```

---

## Architecture

Services are designed to be:
- **Independent**: Can run standalone
- **Scalable**: Support horizontal scaling
- **Observable**: Logging and metrics
- **Fault-tolerant**: Graceful error handling

---

## See Also

- [docs/AGENTS.md](../docs/AGENTS.md) - Agent system documentation
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
