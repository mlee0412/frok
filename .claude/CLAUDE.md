# FROK Project - AI Assistant Guide

**Last Updated**: 2025-11-14
**Project Status**: Session #22 - Multimodal Chat Redesign (Day 10 Complete)

---

## 📋 Project Overview

**FROK** is a production-ready, full-stack monorepo for a **multi-agent AI platform** featuring:
- 🤖 **6 specialized AI agents** powered by OpenAI Agents SDK (GPT-5 family)
- 💬 **Multimodal chat interface** (text, voice, file uploads)
- 🏠 **Smart home automation** (Home Assistant integration)
- 🧠 **Memory management** with vector + keyword hybrid search
- 🔬 **Research & code execution** capabilities
- 📱 **Mobile-first** responsive design with gesture controls

**Tech Stack**: Next.js 15 + React 19 + TypeScript + Tailwind + Fastify + Supabase + OpenAI

---

## 🚀 SuperClaude Integration

This project uses **SuperClaude Framework** for enhanced development capabilities.

### Available Skills

- **confidence-check**: Validates implementation confidence before proceeding (≥90% threshold)

### Core Development Principles

#### 1. Evidence-Based Development
**Never guess** - verify with official docs before implementation. Use MCP servers for research.

#### 2. Confidence-First Implementation
Check confidence BEFORE starting:
- ≥90%: Proceed with implementation
- 70-89%: Present alternatives and ask for clarification
- <70%: Ask questions to gather more information

#### 3. Parallel-First Execution
Use **Wave → Checkpoint → Wave** pattern for faster execution:
- Read multiple files in parallel
- Analyze results
- Edit multiple files in parallel

#### 4. Token Efficiency
- Simple tasks (typo fix): ~200 tokens
- Medium tasks (bug fix): ~1,000 tokens
- Complex tasks (feature): ~2,500 tokens
- Always run confidence checks to prevent wasted tokens

---

## 📂 Project Structure

```
/home/user/frok/
├── apps/
│   ├── web/                      # Next.js 15 main application (React 19)
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router (pages: auth, dashboard, agent, voice, chat)
│   │   │   ├── components/      # Feature components (chat, voice, dashboard, navigation, mobile)
│   │   │   ├── hooks/           # React hooks (useChat, useMemories, useDebounce, useGestures)
│   │   │   ├── store/           # Zustand stores (unifiedChatStore, ttsStore, userPreferencesStore)
│   │   │   ├── lib/             # Utilities (api, agent, supabase, voice, i18n, cache, homeassistant)
│   │   │   ├── schemas/         # Zod validation schemas (chat, agent, memory, voice, finance)
│   │   │   ├── types/           # TypeScript type definitions
│   │   │   └── styles/          # CSS and styling
│   │   ├── messages/            # i18n translations (en.json, ko.json - 660+ keys)
│   │   ├── e2e/                 # Playwright E2E tests
│   │   └── public/              # Static assets, PWA manifest
│   │
│   ├── api/                      # Fastify API backend (TypeScript)
│   ├── voice-server/             # WebSocket voice streaming
│   └── ui-docs/                  # Storybook component documentation
│
├── packages/
│   ├── clients/                  # @frok/clients - HTTP/SDK clients
│   ├── types/                    # @frok/types - Shared TypeScript definitions
│   ├── ui/                       # @frok/ui - Reusable React components
│   ├── utils/                    # @frok/utils - Shared utility functions
│   ├── db/                       # @frok/db - Database utilities
│   └── config/                   # @frok/config - TypeScript/ESLint config
│
├── services/
│   ├── agents/                   # AI agent orchestration (integrated into apps/web/src/lib/agent/)
│   │   ├── orchestrator-enhanced.ts   # 6-agent router
│   │   ├── tools-unified.ts           # 11 tools (6 OpenAI + 5 custom)
│   │   ├── responseSchemas.ts         # 6 structured output types
│   │   └── guardrails.ts              # 9 safety/quality guardrails
│   │
│   └── mcp/                      # Model Context Protocol servers
│       ├── github/               # GitHub integration
│       ├── google/               # Calendar, Gmail
│       ├── home-assistant/       # Smart home automation
│       └── square/               # Payment processing
│
├── docs/
│   ├── ARCHITECTURE.md           # System architecture overview
│   ├── AGENTS.md                 # Agent system documentation
│   ├── guides/                   # QUICKSTART, SETUP_GUIDE
│   └── architecture/             # Deep-dive docs
│
├── .github/workflows/            # CI/CD pipeline
├── turbo.json                    # Turbo cache config
├── pnpm-workspace.yaml           # Workspace definition
└── tsconfig.base.json            # Root TypeScript config
```

---

## 🛠️ Tech Stack Reference

### Frontend
- **Framework**: Next.js 15.5.5 (App Router) + React 19.1.0 + TypeScript 5.9.3
- **Styling**: Tailwind CSS 4.1.14 with CSS custom properties (design tokens)
- **State**: Zustand 5.0.8 (persistent) + TanStack Query 5.90.3 (server cache)
- **Forms**: React Hook Form 7.65.0 + Zod 3.25.76
- **Voice**: Deepgram SDK 4.11.2, WebSockets
- **Animations**: Framer Motion 12.23.24
- **UI Components**: Custom library (@frok/ui) + Storybook

### Backend
- **API**: Fastify 5.6.1 (TypeScript)
- **Database**: Supabase (Postgres + Auth)
- **AI**: OpenAI Agents SDK (GPT-5 Think/Mini/Nano)
- **Monitoring**: Sentry error tracking
- **Rate Limiting**: Upstash Redis

### Infrastructure
- **Deployment**: Vercel (frontend), Railway (backend)
- **Monorepo**: pnpm 10.18.2 + Turbo 2.5.8
- **Testing**: Vitest (unit, 60% coverage) + Playwright (E2E)
- **Node.js**: 22.11.0 (pinned via `.nvmrc`)

---

## 💻 Development Workflows

### Essential Commands

```bash
# Development
pnpm dev              # Start all apps in parallel
pnpm dev:web          # Start Next.js only (port 3000)
pnpm dev:api          # Start Fastify API only (port 4000)

# Code Quality
pnpm typecheck        # ⚠️ MUST PASS before commits
pnpm lint             # ESLint entire workspace
pnpm test             # Vitest unit tests
pnpm test:coverage    # Coverage report (60% minimum)

# Testing
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Interactive E2E debugging

# Building
pnpm build            # Build all apps
pnpm build:analyze    # Bundle analysis

# Utilities
pnpm reset:dev        # Kill Node/free ports/clear cache

# Workspace-specific
pnpm -F @frok/web build
pnpm -F @frok/ui-docs dev  # Storybook on :6006
```

### CI/CD Pipeline

All PRs must pass:
1. ✅ **Dependencies** - pnpm install with frozen lockfile
2. ✅ **Typecheck** - `pnpm typecheck` (0 compilation errors)
3. ✅ **Lint** - ESLint validation
4. ✅ **Unit Tests** - Vitest with 60% coverage
5. ✅ **E2E Tests** - Playwright (chromium)
6. ✅ **Build** - Production build succeeds
7. ✅ **Lighthouse CI** - Performance benchmarks

---

## 📐 Code Patterns & Conventions

### 1. Component Structure (Next.js 15)

**Server Components** (default):
```typescript
// app/dashboard/page.tsx
// ✅ Use for: data fetching, auth checks, direct DB access
export default async function DashboardPage() {
  const data = await fetchData();
  return <div>{data.title}</div>;
}
```

**Client Components**:
```typescript
// components/InteractiveButton.tsx
// ✅ Required for: hooks, events, browser APIs, state
'use client';
import { useState } from 'react';

export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### 2. State Management

**Zustand** (Global Persistent):
```typescript
// For: chat threads, user preferences, app-wide state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useChatStore = create<State>()(
  persist(
    (set) => ({
      threads: [],
      addThread: (thread) => set((s) => ({ threads: [...s.threads, thread] })),
    }),
    { name: 'chat-store' }
  )
);
```

**TanStack Query** (Server Data):
```typescript
// For: API data with caching, optimistic updates
const { data: threads } = useChatThreads();
const createMutation = useCreateThread();
```

**useState** (Component-local):
```typescript
// For: UI state (modals, dropdowns, form inputs)
const [isOpen, setIsOpen] = useState(false);
```

### 3. API Route Pattern (CRITICAL)

**ALL API routes MUST include this middleware stack**:

```typescript
// apps/web/src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, withAuth, withValidation } from '@/lib/api';
import { ExampleSchema } from '@/schemas/example';

export async function POST(req: NextRequest) {
  // 1. Rate limiting (REQUIRED for AI routes)
  const rateLimitResult = await withRateLimit('ai')(req);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication (ALWAYS required)
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Validation (Zod schema)
  const validated = await withValidation(ExampleSchema)(req);
  if (!validated.ok) return validated.response;

  // 4. Business logic
  try {
    const result = await doSomething(validated.data, auth.user.id);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    // 5. Error handling (log to Sentry)
    errorHandler.logError({
      message: error.message,
      context: { userId: auth.user.id }
    });
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

**Rate Limits**:
- `'ai'`: 5 requests/minute (for expensive AI operations)
- `'standard'`: 60 requests/minute (for normal operations)

### 4. Form Validation (Zod)

**All inputs MUST be validated**:
```typescript
// Define schema in src/schemas/
export const CreateThreadSchema = z.object({
  title: z.string().min(1).max(100),
  userId: z.string().uuid(),
});

// Use in API route
const validated = await withValidation(CreateThreadSchema)(req);
```

**Existing schemas**: `chat.ts`, `agent.ts`, `memory.ts`, `finance.ts`, `voice.ts`, `homeAssistant.ts`, `common.ts`

### 5. Database Patterns (Supabase)

**Three client types** (DO NOT confuse):

```typescript
// Client component (browser) - respects RLS
import { supabaseClient } from '@/lib/supabaseClient';

// Server component/API route - server-side with user context
import { getSupabaseServer } from '@/lib/supabase/server';
const supabase = await getSupabaseServer();

// Admin operations - bypasses RLS (use sparingly)
import { getSupabaseAdmin } from '@/lib/supabase/server';
const supabase = getSupabaseAdmin();
```

### 6. Styling Convention (CRITICAL)

**❌ NEVER hardcode colors**:
```typescript
// ❌ WRONG - Will break dark mode and themes
className="bg-gray-900 text-gray-400 border-gray-700"
```

**✅ ALWAYS use CSS variables**:
```typescript
// ✅ CORRECT - Uses semantic tokens from @frok/ui/styles/tokens.css
className="bg-surface text-foreground/70 border-border"
```

**Available CSS Variables**:
```css
/* Primary colors */
--color-primary          /* Main brand color */
--color-accent           /* Accent highlights */

/* Surface colors */
--color-background       /* Page background */
--color-surface          /* Cards, panels */
--color-foreground       /* Text color */

/* UI elements */
--color-border           /* Borders */
--color-ring             /* Focus rings */
--color-muted            /* Disabled states */

/* Semantic colors */
--color-success          /* Success states */
--color-danger           /* Error states */
--color-warning          /* Warning states */
--color-info             /* Info states */
```

### 7. Type System

**Always use workspace types**:
```typescript
// ✅ CORRECT
import type { ChatThread, ChatMessage } from '@frok/types';

// ❌ WRONG - Don't define types inline
type ChatThread = { ... };
```

**Never use `any`**:
```typescript
// ❌ WRONG
const value: any;

// ✅ CORRECT - Use unknown with type narrowing
const value: unknown;
if (typeof value === 'string') {
  // TypeScript now knows value is string
}
```

### 8. Import Patterns

**Path aliases** (defined in `tsconfig.base.json`):
```typescript
// ✅ CORRECT
import { Button } from '@frok/ui';
import { ChatThread } from '@frok/types';
import { api } from '@frok/clients';
import { formatDate } from '@frok/utils';
import { Chat } from '@/components/Chat';  // Web app src

// ❌ WRONG - Don't use relative paths for shared packages
import { Button } from '../../../packages/ui/src/Button';
```

---

## 🧪 Testing Requirements

### Unit Tests (Vitest)
- **Location**: `src/**/*.{test,spec}.{ts,tsx}`
- **Coverage**: 60% minimum (enforced in CI)
- **Environment**: JSDOM
- **Commands**:
  - `pnpm test` - Run all tests
  - `pnpm test:coverage` - Generate coverage report
  - `pnpm test:watch` - Watch mode

### E2E Tests (Playwright)
- **Location**: `e2e/tests/*.spec.ts`
- **Browsers**: Chromium, Firefox, WebKit
- **Commands**:
  - `pnpm test:e2e` - Run all E2E tests
  - `pnpm test:e2e:ui` - Interactive debugging
- **Auth**: Managed via `.auth/user.json` (auto-generated)

### Type Safety
- **Command**: `pnpm typecheck`
- **Requirement**: 0 compilation errors (enforced in CI)
- **Must pass**: Before every commit

---

## ⚠️ Common Pitfalls & Warnings

### CRITICAL RULES (Never Break)

1. **TypeScript MUST compile**
   - Run `pnpm typecheck` before commits
   - CI will reject PRs with type errors

2. **NO hardcoded colors**
   - Always use CSS variables from `@frok/ui/styles/tokens.css`
   - Ensures dark mode and theme consistency

3. **ALL API routes need middleware**
   - Authentication: `withAuth` (no exceptions)
   - Rate limiting: `withRateLimit` for expensive operations
   - Validation: `withValidation` with Zod schemas

4. **Test coverage minimum**
   - Maintain 60% coverage for web app
   - CI enforces this threshold

### Common Mistakes

| ❌ Wrong | ✅ Correct | Why |
|---------|-----------|-----|
| `import { Card } from '@/components/ui/card'` | `import { Card } from '@frok/ui'` | Use workspace packages |
| `bg-gray-900 text-white` | `bg-surface text-foreground` | Use CSS variables |
| `const userId = 'hardcoded-id'` | Extract from `withAuth(req)` | Never hardcode user IDs |
| Missing `withAuth` in API route | Always include auth middleware | Security requirement |
| `const value: any` | `const value: unknown` | Type safety |
| `'use client'` on every component | Only when using hooks/events | Optimize bundle size |

### Performance Gotchas

1. **Image Optimization**: Always use Next.js `<Image>` component
2. **Code Splitting**: Use dynamic imports for heavy components
3. **Server Components**: Prefer server components when possible
4. **Zustand Updates**: Use functional updates for state

---

## 🤖 AI Agent System

### 6 Specialized Agents

1. **Home Control Specialist** - Smart home device control (Home Assistant)
2. **Memory Specialist** - Long-term knowledge management
3. **Research Specialist** - Web search and document analysis
4. **Code Execution Specialist** - Python sandbox execution
5. **General Problem Solver** - Multi-domain tasks
6. **FROK Orchestrator** - Query routing and complexity classification

### 11 Available Tools

**Built-in OpenAI Tools**:
- `web_search`, `file_search`, `code_interpreter`
- `computer_use`, `image_generation`, `hosted_mcp`

**Custom Tools**:
- `ha_search`, `ha_call` - Home Assistant integration
- `memory_add`, `memory_search` - Knowledge management
- `custom_web_search` - Enhanced web research

### Guardrails (9 Safety Mechanisms)

- Input sanitization
- Content filtering
- Prompt injection detection
- Output quality validation
- Home Assistant safety checks
- Cost limiting
- Information leakage detection
- Rate limiting
- Error recovery

**Location**: `apps/web/src/lib/agent/`

---

## 🌐 Internationalization (i18n)

- **Location**: `apps/web/messages/`
- **Languages**: English (`en.json`), Korean (`ko.json`)
- **Keys**: 660+ translation keys
- **Library**: next-intl
- **Usage**:
  ```typescript
  import { useTranslations } from 'next-intl';

  function Component() {
    const t = useTranslations('common');
    return <h1>{t('welcome')}</h1>;
  }
  ```

---

## 📱 Mobile-First Features

### Voice Interface
- **Desktop**: Modal overlay with backdrop
- **Mobile**: Fullscreen immersive mode
- **Gestures**: Swipe-down to dismiss, long-press to lock
- **Visualizer**: Canvas-based waveform (60 bars, 60fps)

### Touch Gestures
- **Swipe**: Navigation and dismissal
- **Long-press**: Action locks
- **Drag**: Interactive controls

### Responsive Breakpoints
```typescript
// Tailwind breakpoints
sm: '640px'   // Small tablets
md: '768px'   // Tablets
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
```

---

## 🔧 MCP Server Integration

### High Priority Servers
- **Context7**: Official documentation lookup (prevent hallucination)
- **Sequential-thinking**: Token-efficient reasoning (30-50% reduction)
- **Tavily**: Web search for research
- **Supabase**: Database operations
- **Sentry**: Error tracking and monitoring

### Optional Servers
- **GitHub**: Repository operations
- **Vercel**: Deployment operations
- **Home Assistant**: Home automation

---

## 📊 Current Development Focus

**Session #22 - Multimodal Chat Redesign (Day 10 Complete)**

Recent work:
- ✅ GPT-5 model selector with Think/Mini/Nano support
- ✅ Message persistence and timeout handling
- ✅ Unified chat architecture migration
- ✅ Mobile gesture controls (swipe, long-press, drag)
- ✅ Fullscreen voice interface for mobile
- ✅ All TypeScript errors resolved

**Active Developer**: mlee0412 (minkilee32@gmail.com)

---

## 🎯 Quick Start for AI Assistants

### Before Making Changes

1. **Understand the context**:
   - Read relevant files in `apps/web/src/`
   - Check existing patterns in similar components
   - Review recent commits for context

2. **Verify your approach**:
   - Run confidence check if available
   - Consult official documentation
   - Check for existing implementations

3. **Plan your changes**:
   - Identify files to modify
   - Consider test coverage
   - Plan parallel execution

### During Implementation

1. **Follow patterns**:
   - Match existing code style
   - Use workspace packages (`@frok/*`)
   - Apply CSS variables (no hardcoded colors)

2. **Include proper middleware**:
   - Auth, validation, rate limiting for API routes
   - Error handling with Sentry logging

3. **Test incrementally**:
   - Run `pnpm typecheck` frequently
   - Test in browser during development
   - Write unit tests for new logic

### After Implementation

1. **Quality checks**:
   ```bash
   pnpm typecheck    # Must pass
   pnpm lint         # Fix any issues
   pnpm test         # Ensure tests pass
   pnpm build        # Verify builds
   ```

2. **Manual testing**:
   - Test in browser (desktop + mobile)
   - Verify responsive design
   - Check dark mode appearance

3. **Documentation**:
   - Update relevant docs if needed
   - Add JSDoc comments for complex functions
   - Update this CLAUDE.md if conventions change

---

## 📚 Additional Resources

- **Architecture**: `/home/user/frok/docs/ARCHITECTURE.md`
- **Agent System**: `/home/user/frok/docs/AGENTS.md`
- **Quick Start**: `/home/user/frok/docs/guides/QUICKSTART.md`
- **Setup Guide**: `/home/user/frok/docs/guides/SETUP_GUIDE.md`
- **Status Updates**: `/home/user/frok/STATUS.md` (session progress)

---

## 🔍 Key Files Reference

| File | Purpose |
|------|---------|
| `apps/web/src/app/` | Next.js App Router pages |
| `apps/web/src/components/` | React components |
| `apps/web/src/lib/agent/orchestrator-enhanced.ts` | Agent routing logic |
| `apps/web/src/lib/agent/tools-unified.ts` | Tool definitions |
| `apps/web/src/schemas/` | Zod validation schemas |
| `apps/web/src/store/` | Zustand stores |
| `packages/ui/` | Shared UI components |
| `packages/types/` | TypeScript definitions |
| `turbo.json` | Monorepo task definitions |
| `tsconfig.base.json` | Path aliases and TS config |

---

*Powered by SuperClaude Framework*
*Last analyzed: 2025-11-14*
