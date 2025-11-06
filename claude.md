# FROK Project - Claude Code Instructions

**Last Updated**: 2025-11-05 (Session #13 - CLAUDE.md Optimization)

> 📚 **Complete Documentation**: [DOCS_INDEX.md](DOCS_INDEX.md) | [Current Status](STATUS.md) | [Session History](docs/development/SESSION_HISTORY.md)
> 🏗️ **Architecture**: [System Architecture](docs/ARCHITECTURE.md) | [Agent System](docs/AGENTS.md)
> ✅ **Testing**: [Testing Guide](apps/web/TESTING.md) | Always test before committing!

## Project Overview

FROK is a full-stack AI-powered personal assistant with a monorepo architecture managed by Turbo + pnpm.

**Tech Stack**:

- **Frontend**: Next.js 15.5.5, React 19.2.0, TypeScript 5.9.3, Tailwind CSS 4.1.14
- **Backend**: Fastify 5.6.1, Supabase (Auth + Database), OpenAI GPT-5 (think/mini/nano)
- **State**: Zustand 5.0.8 + localStorage, TanStack Query 5.90.3
- **Testing**: Vitest (unit), Playwright (E2E), 44/48 tests passing, 60% coverage threshold
- **Monorepo**: Turbo 2.5.8 + pnpm 10.18.2

**Current Status**: Production-ready with 100% authentication, full type safety, rate limiting, and i18n support (EN/KO).

## Directory Structure

```
FROK/
├── apps/
│   ├── web/              # Next.js 15 main app → See apps/web/CLAUDE.md
│   ├── api/              # Fastify 5 backend
│   ├── cli/              # CLI tools
│   ├── workers/          # Background workers
│   └── ui-docs/          # Storybook docs
├── packages/
│   ├── ui/               # Shared components → See packages/ui/CLAUDE.md
│   ├── clients/          # API clients
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   └── db/               # Database schema & migrations
├── services/
│   └── agents/           # AI orchestration → See services/agents/CLAUDE.md
└── docs/                 # Documentation (DOCS_INDEX.md is the hub)
```

**📂 Directory-Specific Context Files**:

- **[apps/web/CLAUDE.md](apps/web/CLAUDE.md)** - Next.js patterns, API routes, state management, i18n, testing
- **[services/agents/CLAUDE.md](services/agents/CLAUDE.md)** - Agent orchestration, tools, guardrails, structured outputs
- **[packages/ui/CLAUDE.md](packages/ui/CLAUDE.md)** - Component development, design tokens, accessibility, Tailwind v4

**Key Locations**:

- **API Routes**: `apps/web/src/app/api/` (all secured with auth + rate limiting)
- **Components**: `apps/web/src/components/` (app-specific), `packages/ui/src/components/` (reusable)
- **Hooks**: `apps/web/src/hooks/` (custom hooks), `apps/web/src/hooks/queries/` (TanStack Query)
- **Stores**: `apps/web/src/store/` (Zustand stores with persistence)

## Development Workflow

### Starting Development

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (localhost:3000)
```

### CRITICAL: Testing Before Commits

**⚠️ ALWAYS test before committing changes:**

```bash
pnpm typecheck            # TypeScript compilation (must pass!)
pnpm test                 # Unit tests with Vitest
pnpm test:e2e             # E2E tests with Playwright
pnpm build                # Production build verification
```

### Git Workflow

```bash
# 1. Make changes
# 2. Test (see above)
# 3. Commit with detailed message
git add .
git commit -m "feat: <description>

Details...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Push
git push origin main      # Triggers Vercel auto-deploy
```

**Branch Naming**: `feat/feature-name`, `fix/bug-name`, `chore/task-name`

## Coding Standards

### State Management

**When to use what**:

- **Zustand**: Global client state with persistence (`chatStore`, `ttsStore`, `userPreferencesStore`)
- **TanStack Query**: Server data fetching, caching (see `apps/web/src/hooks/queries/`)
- **useState**: Component-local UI state (toggles, forms)
- **URL State**: Filters, pagination (use `useURLState` or `useURLParams`)

### Component Patterns

**Always use UI components from `@frok/ui`**:

```typescript
// ❌ Wrong
<button className="...">Click</button>;

// ✅ Correct
import { Button } from '@frok/ui';
<Button variant="primary">Click</Button>;
```

**Always use named exports**:

```typescript
// ❌ Wrong
export default function Button() { ... }

// ✅ Correct
export function Button() { ... }
```

### API Route Patterns

**All routes MUST have**:

1. **Authentication**: `withAuth(req)` or `optionalAuth(req)`
2. **Validation**: `withValidation(schema)(req)` for all inputs
3. **Rate Limiting**: `withRateLimit('ai' | 'standard' | 'read')` for appropriate routes
4. **Error Handling**: Use `try/catch` with `errorHandler.logError()`

**Example**:

```typescript
export async function POST(req: NextRequest) {
  // 1. Auth (REQUIRED)
  const user = await withAuth(req);
  if (!user.ok) return user.response;

  // 2. Validation (REQUIRED for inputs)
  const body = await withValidation(CreatePostSchema)(req);
  if (!body.ok) return body.response;

  // 3. Business logic
  try {
    const result = await createPost(body.data, user.id);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    errorHandler.logError({ message: ..., context: { route: ... } });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
```

### Type Safety

**Never use `any`** - use `unknown` for truly unknown types:

```typescript
// ❌ Wrong
const data: any = await fetchData();

// ✅ Correct
const data: unknown = await fetchData();
if (isValidData(data)) {
  // Type narrowing
}
```

**Import database types**:

```typescript
import type { ChatThreadRow, ChatMessageRow } from '@/types/database';
```

### Styling Standards

**Always use CSS variables** (never hardcoded colors):

```typescript
// ❌ Wrong
className = 'bg-gray-900 text-gray-400';

// ✅ Correct
className = 'bg-surface text-foreground/70';
```

**Available variables**: `--color-primary`, `--color-surface`, `--color-border`, `--color-foreground`

## Documentation Requirements

### When to Update Documentation

**Update CLAUDE.md** when:

- Adding new coding patterns
- Changing architecture
- Adding new tools/libraries
- Discovering common pitfalls

**Update STATUS.md** when:

- Starting new features
- Completing major work
- Changing priorities

**Update docs/development/SESSION_HISTORY.md** when:

- Completing a significant session
- Making architectural changes
- Implementing new features

**Update directory-specific CLAUDE.md** when:

- Making subsystem-specific changes
- Adding domain-specific patterns
- See: `apps/web/CLAUDE.md`, `services/agents/CLAUDE.md`, `packages/ui/CLAUDE.md`

### Commit Message Format

```
<type>: <short description>

<detailed explanation of changes>
<why these changes were made>
<any breaking changes or important notes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`

## Essential Commands

```bash
# Development
pnpm dev                  # Start all apps in dev mode
pnpm dev:web              # Start web app only
pnpm dev:api              # Start API server only

# Testing (ALWAYS before commits!)
pnpm test                 # Unit tests
pnpm test:e2e             # E2E tests
pnpm test:coverage        # Coverage report
pnpm typecheck            # TypeScript compilation

# Building
pnpm build                # Build all apps
pnpm build:web            # Build web app only
pnpm build:analyze        # Analyze bundle size

# Package Management
pnpm -F @frok/ui add <pkg>     # Add to ui package
pnpm -F apps/web add <pkg>      # Add to web app
```

## Quick Reference Links

- **[Complete Documentation Index](DOCS_INDEX.md)** - Hub for all documentation
- **[Session History](docs/development/SESSION_HISTORY.md)** - Detailed session logs (Sess #2-12)
- **[Current Status & TODOs](STATUS.md)** - Active work and priorities
- **[Architecture Details](docs/ARCHITECTURE.md)** - System design and data flow
- **[Agent System](docs/AGENTS.md)** - AI orchestration (6 agents, 11 tools)
- **[Testing Guide](apps/web/TESTING.md)** - E2E and unit testing
- **[Normalization Plan](docs/architecture/NORMALIZATION_PLAN.md)** - Architecture standards

## Common Pitfalls & Solutions

### 1. Import Errors

```typescript
// ❌ Wrong (old path)
import { Card } from '@/components/ui/card';

// ✅ Correct
import { Card } from '@frok/ui';
```

### 2. Button Variants

Only three variants exist: `primary`, `outline`, `ghost`. No `danger` or `warning` variants.

### 3. Authentication

Never use hardcoded user IDs. Always use `withAuth(req)` to get authenticated user.

### 4. TypeScript Errors

Run `pnpm typecheck` before committing. Fix ALL errors before pushing.

### 5. Missing Tests

Add tests for new features. Maintain 60% coverage threshold.

### 6. Supabase Client

- **Browser**: Use `supabaseClient` from `@/lib/supabaseClient`
- **Server**: Use `getSupabaseServer()` from `@/lib/supabase/server`
- **Admin**: Use `getSupabaseAdmin()` (bypasses RLS)

### 7. Rate Limiting

Apply rate limiting to:

- **AI routes**: `withRateLimit('ai')` - 5 req/min
- **Regular routes**: `withRateLimit('standard')` - 60 req/min
- **Read routes**: `withRateLimit('read')` - 120 req/min

---

**Note**: This is a concise reference optimized for Claude Code context efficiency. For detailed session logs, implementation details, and architecture documentation, see the links above. **ALWAYS test before committing!**
