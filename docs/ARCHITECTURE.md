# System Architecture Documentation

> **Navigation Hub**: Complete guide to FROK's monorepo architecture and system design

**Last Updated**: 2025-11-05
**Quick Links**: [Normalization](architecture/NORMALIZATION_PLAN.md) | [Agent System](architecture/AGENT_SYSTEM_ANALYSIS.md) | [Security](architecture/AGENT_ROUTES_SECURITY_AUDIT.md)

---

## 🏗️ Monorepo Structure

```
FROK/
├── apps/           - Applications (web, api, cli, workers, ui-docs)
├── packages/       - Shared libraries (clients, db, types, ui, utils)
├── services/       - Long-running services (agents, MCP servers)
├── infra/          - Infrastructure and deployment
├── scripts/        - Development utilities
└── docs/           - Documentation
```

**See**: [Root README.md](../README.md) for quick start

---

## 📋 Component Documentation

### Applications (`apps/`)

- **[apps/web/](../apps/web/README.md)** - Next.js 15.5.5 web application
  - React 19.2.0, Tailwind CSS 4.1.14
  - [Testing Guide](../apps/web/TESTING.md)
  - [Bundle Optimization](../apps/web/BUNDLE_OPTIMIZATION.md)
  - [Performance Monitoring](../apps/web/PERFORMANCE_MONITORING.md)

- **[apps/api/](../apps/api/README.md)** - Fastify 5.6.1 API server
  - TypeScript, authentication, rate limiting

- **Other Apps**: cli, workers, ui-docs (Storybook)

### Packages (`packages/`)

- **[packages/](../packages/README.md)** - Overview of shared libraries
  - `@frok/clients` - HTTP/SDK clients
  - `@frok/db` - Database utilities
  - `@frok/types` - Shared TypeScript types
  - `@frok/ui` - UI component library
  - `@frok/utils` - Shared utilities

### Services (`services/`)

- **[services/](../services/README.md)** - Long-running services
  - `agents/` - AI agent orchestration ([AGENTS.md](AGENTS.md))
  - `mcp/` - Model Context Protocol servers

### Infrastructure (`infra/`)

- **[infra/](../infra/README.md)** - Infrastructure and setup scripts
  - Bootstrap, dev environment, checks

---

## 📖 Architecture Documentation Index

### 🏗️ System Design

- **[Normalization Plan](architecture/NORMALIZATION_PLAN.md)**
  4-phase plan for codebase consistency and maintainability

- **[Agent System Analysis](architecture/AGENT_SYSTEM_ANALYSIS.md)**
  Multi-agent orchestration architecture (56 sections)

- **[Memory System Analysis](architecture/MEMORY_SYSTEM_ANALYSIS.md)**
  Hybrid vector + keyword search implementation

### 🔒 Security & Quality

- **[Agent Routes Security Audit](architecture/AGENT_ROUTES_SECURITY_AUDIT.md)**
  Security implementation for 8 agent API routes

- **[Audit Log 2025-11-02](architecture/AUDIT_LOG_2025_11_02.md)**
  Comprehensive codebase audit

- **[Development Plan Fact-Check](architecture/DEVELOPMENT_PLAN_FACTCHECK.md)**
  Validation of development estimates and claims

---

## 🎯 Tech Stack

### Frontend
- **Framework**: Next.js 15.5.5 (App Router)
- **UI**: React 19.2.0, Tailwind CSS 4.1.14
- **State**: Zustand 5.0.8 + TanStack Query 5.90.3
- **Forms**: React Hook Form 7.65.0 + Zod validation

### Backend
- **API**: Fastify 5.6.1 (TypeScript)
- **Database**: Supabase (Postgres + Auth)
- **AI**: OpenAI Agents SDK (GPT-5 Think/Mini/Nano)

### Infrastructure
- **Monorepo**: Turbo 2.5.8 + pnpm 10.18.2
- **Testing**: Playwright (E2E) + Vitest (unit)
- **CI/CD**: GitHub Actions + Vercel

---

## 🔄 Data Flow

### High-Level Request Flow

```
User → Frontend (Next.js) → API Routes → Agent System → Tools → External Services
                                ↓
                          Database (Supabase)
```

**Detailed Flow**: See [Agent System Analysis](architecture/AGENT_SYSTEM_ANALYSIS.md#12-request-flow-diagram)

---

## 📚 Related Documentation

- **[AGENTS.md](AGENTS.md)** - Agent system architecture
- **[CLAUDE.md](../CLAUDE.md)** - Complete project documentation
- **[ROADMAP.md](ROADMAP.md)** - Development roadmap
- **[Guides](guides/)** - Implementation guides

---

**Maintained By**: FROK Development Team
**Next Review**: After major architectural changes
