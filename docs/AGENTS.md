# Agent System Documentation

> **Navigation Hub**: Complete guide to FROK's multi-agent AI system

**Last Updated**: 2025-11-05
**Quick Links**: [Architecture](architecture/AGENT_SYSTEM_ANALYSIS.md) | [Security](architecture/AGENT_ROUTES_SECURITY_AUDIT.md) | [Roadmap](roadmaps/OPENAI_IMPROVEMENTS_ROADMAP.md)

---

## 🎯 Overview

FROK uses a **sophisticated multi-agent orchestration platform** built on OpenAI's Agents SDK featuring:

- 🤖 **6 Specialized Agents** - Router, Home Control, Memory, Research, Code Execution, General Problem Solver
- 🛠️ **11 Powerful Tools** - 6 OpenAI built-in + 5 custom integrations
- 🔄 **Smart Routing** - Query complexity classification and dynamic model selection
- 📡 **Streaming Responses** - Real-time Server-Sent Events (SSE)
- 🔒 **Security-First** - Authentication, rate limiting, user isolation

---

## 📚 Documentation Index

### 🏗️ Architecture & Design

- **[Agent System Analysis](architecture/AGENT_SYSTEM_ANALYSIS.md)** (56 sections, comprehensive)
  Detailed architecture, request flow, routing logic, tools, and file structure

- **[Memory System Analysis](architecture/MEMORY_SYSTEM_ANALYSIS.md)**
  Hybrid vector + keyword search, optimization strategies

- **[Normalization Plan](architecture/NORMALIZATION_PLAN.md)**
  Code consistency, modularity, maintainability improvements

### 🔒 Security & Quality

- **[Agent Routes Security Audit](architecture/AGENT_ROUTES_SECURITY_AUDIT.md)**
  Security audit of 8 agent API routes (Session #6) with authentication and rate limiting

- **[Audit Log 2025-11-02](architecture/AUDIT_LOG_2025_11_02.md)**
  Comprehensive codebase audit methodology and findings

### 🚀 Implementation History

- **[Session #10: OpenAI Agent Upgrade](../CLAUDE.md#session-10-openai-agent-upgrade---built-in-tools--advanced-features-latest)** (in CLAUDE.md)
  Structured outputs, guardrails, built-in tools integration, response caching

- **[Session #6: Agent Routes Security](../CLAUDE.md#session-6-agent-routes-security--migration-latest)** (in CLAUDE.md)
  Security implementation for all agent API routes

- **[Phase 0: Quick Wins](archive/PHASE_0_QUICK_WINS_COMPLETE.md)**
  Auto thread titles, context-aware suggestions, cost tracking

### 🗺️ Future Enhancements

- **[OpenAI Improvements Roadmap](roadmaps/OPENAI_IMPROVEMENTS_ROADMAP.md)**
  3-phase plan: Built-in tools (✅ complete), Performance optimization, Advanced features

- **[Claude Development Roadmap](roadmaps/CLAUDE_DEVELOPMENT_ROADMAP.md)**
  6-month phased implementation plan

---

## 🚀 Quick Start

### For Developers

1. **Understand the System**
   - Read [Agent System Analysis](architecture/AGENT_SYSTEM_ANALYSIS.md) first
   - Review [Session #10 Summary](../CLAUDE.md#session-10) for recent upgrades

2. **Security Best Practices**
   - Review [Security Audit](architecture/AGENT_ROUTES_SECURITY_AUDIT.md)
   - All new routes must use `withAuth()` and `withRateLimit()`

3. **Code Location**
   - Frontend: `apps/web/src/app/(main)/agent/page.tsx`
   - API Routes: `apps/web/src/app/api/agent/*`
   - Orchestrator: `apps/web/src/lib/agent/orchestrator-enhanced.ts`
   - Tools: `apps/web/src/lib/agent/tools-unified.ts`

### For Users

See the [Agent Features Documentation](archive/AGENT_FEATURES.md) for user-facing capabilities.

---

## 🔍 See Also

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Overall system architecture
- **[CLAUDE.md](../CLAUDE.md)** - Complete project documentation
- **[STATUS.md](../STATUS.md)** - Current development status

---

**Maintained By**: FROK Development Team
**Next Review**: After Session #14 completion
