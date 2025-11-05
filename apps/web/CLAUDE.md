# apps/web - Next.js 15 Application Context

**Purpose**: Domain-specific patterns and conventions for the Next.js 15 web application.

> 📚 **Parent Context**: See [root CLAUDE.md](../../CLAUDE.md) for project-wide standards

---

## Directory Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (main)/            # Main application layout group
│   │   │   ├── agent/         # AI agent chat interface
│   │   │   └── page.tsx       # Root page (redirects to /dashboard)
│   │   ├── dashboard/         # Dashboard pages with nested routes
│   │   ├── auth/              # Authentication pages
│   │   └── api/               # API routes (all require auth + validation)
│   ├── components/            # App-specific React components
│   ├── hooks/                 # Custom React hooks
│   │   └── queries/           # TanStack Query hooks (useChat, useMemories)
│   ├── lib/                   # Utility libraries
│   │   ├── api/               # API middleware (withAuth, withValidation, withRateLimit)
│   │   ├── agent/             # Agent orchestration & tools
│   │   └── supabase/          # Supabase clients
│   ├── store/                 # Zustand stores (chatStore, ttsStore, userPreferencesStore)
│   ├── schemas/               # Zod validation schemas (chat, agent, finance, memory)
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets (sw.js, manifest.json, icons)
├── messages/                  # i18n translation files (en.json, ko.json)
└── e2e/                       # Playwright E2E tests
```

---

## Next.js 15 App Router Patterns

### Route Handlers (API Routes)

**All API routes MUST follow this pattern**:

```typescript
// apps/web/src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withValidation } from '@/lib/api/withValidation';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { ExampleSchema } from '@/schemas/example';
import { errorHandler } from '@/lib/errorHandler';

export async function POST(req: NextRequest) {
  // 1. Rate limiting (REQUIRED for AI routes, recommended for others)
  const rateLimitResult = await withRateLimit('ai')(req);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication (REQUIRED)
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Validation (REQUIRED for inputs)
  const validated = await withValidation(ExampleSchema)(req);
  if (!validated.ok) return validated.response;

  // 4. Business logic
  try {
    const result = await doSomething(validated.data, auth.user.id);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      context: { route: '/api/example', userId: auth.user.id },
    });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
```

**Rate Limiting Presets**:
- `ai` - 5 req/min (for expensive AI operations)
- `standard` - 60 req/min (for regular API routes)
- `read` - 120 req/min (for read-only operations)

### Server Components vs Client Components

**Server Components** (default):
- Use for data fetching, authentication checks
- Can directly access databases, read files
- Reduce client bundle size

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetchData(); // Direct async data fetching
  return <div>{data.title}</div>;
}
```

**Client Components** (use 'use client'):
- Required for: hooks, event handlers, browser APIs, state
- Mark with `'use client'` directive at top of file

```typescript
'use client';
import { useState } from 'react';

export function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Route Groups

Use `(groupName)` for layout organization without affecting URL:
- `(main)` - Main authenticated application
- `(auth)` - Authentication pages (sign-in, sign-up)

---

## State Management Patterns

### When to Use What

**Zustand** (Global client state with persistence):
```typescript
// Import from centralized store
import { useChatStore } from '@/store';

function Component() {
  const { threads, addThread } = useChatStore();
  // State persists across sessions via localStorage
}
```

**TanStack Query** (Server data with caching):
```typescript
import { useChatThreads, useCreateThread } from '@/hooks/queries';

function Component() {
  const { data: threads, isLoading } = useChatThreads();
  const createMutation = useCreateThread();

  // Automatic caching, refetching, optimistic updates
}
```

**useState** (Component-local UI state):
```typescript
const [isOpen, setIsOpen] = useState(false); // Ephemeral modal state
```

**URL State** (Bookmarkable filters/pagination):
```typescript
import { useURLState } from '@/hooks/useURLState';

const [page, setPage] = useURLState('page', '1');
// URL: /dashboard?page=2
```

---

## Component Patterns

### Always Import from @frok/ui

```typescript
// ❌ Wrong - Never create raw HTML elements
<button className="...">Click</button>
<input type="text" />

// ✅ Correct - Use standardized UI components
import { Button, Input } from '@frok/ui';
<Button variant="primary">Click</Button>
<Input type="text" placeholder="Enter..." />
```

**Available Components**: Button, Input, Card, Modal, Toaster, SideNav, ChatSidebar, ConfirmDialog

### Dynamic Imports for Heavy Components

```typescript
// For modals and heavy components to reduce initial bundle
import dynamic from 'next/dynamic';

const HeavyModal = dynamic(() => import('@/components/HeavyModal'), {
  loading: () => <div>Loading...</div>,
});
```

---

## Internationalization (i18n)

**Using Translations**:
```typescript
import { useTranslations } from '@/lib/i18n/I18nProvider';

function Component() {
  const t = useTranslations('common'); // Namespace: common, auth, chat, etc.

  return <div>{t('save')}</div>; // "Save" or "저장" based on locale
}
```

**Translation Files**: `apps/web/messages/en.json`, `apps/web/messages/ko.json`

**Supported Locales**: `en`, `ko` (660+ translation keys across 16 categories)

---

## Testing

### Unit Tests (Vitest)

```bash
pnpm test                 # Run all tests
pnpm test:ui              # Interactive UI
pnpm test:coverage        # With coverage report (60% threshold)
```

**Test Location**: `src/__tests__/components/ComponentName.test.tsx`

### E2E Tests (Playwright)

```bash
pnpm test:e2e             # Run E2E tests (headless)
pnpm test:e2e:ui          # Interactive mode
pnpm test:e2e:debug       # Debug mode
```

**Test Location**: `e2e/tests/feature.spec.ts`

**Auth Setup**: Tests use `.auth/user.json` for authentication (created by `e2e/auth.setup.ts`)

---

## Performance Optimizations

### Image Optimization

```typescript
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  src="/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={false}  // true for above-the-fold images
/>
```

**Features**: Lazy loading, AVIF/WebP formats, responsive sizes, blur placeholder

### Code Splitting

Already implemented for:
- Dashboard pages (dynamic imports)
- Finance components (100-150KB savings)
- Smart home view (30-50KB savings)

### ISR (Incremental Static Regeneration)

```typescript
// app/dashboard/page.tsx
export const revalidate = 30; // Revalidate every 30 seconds
```

---

## Common Pitfalls

### 1. Import Paths
```typescript
// ❌ Wrong
import { Card } from '@/components/ui/card';

// ✅ Correct
import { Card } from '@frok/ui';
```

### 2. Supabase Client Selection
```typescript
// Client components (browser)
import { supabaseClient } from '@/lib/supabaseClient';

// Server components
import { getSupabaseServer } from '@/lib/supabase/server';
const supabase = getSupabaseServer();

// Admin operations (bypasses RLS)
import { getSupabaseAdmin } from '@/lib/supabase/server';
const supabase = getSupabaseAdmin();
```

### 3. Authentication in API Routes
```typescript
// ❌ Wrong - Never hardcode user IDs
const userId = '00000000-0000-0000-0000-000000000000';

// ✅ Correct - Always use withAuth
const auth = await withAuth(req);
if (!auth.ok) return auth.response;
const userId = auth.user.id;
```

### 4. TypeScript Errors
Always run `pnpm typecheck` before committing. Fix ALL errors.

### 5. Missing Validation
Every API route accepting input MUST use Zod validation schemas from `src/schemas/`.

---

## Quick Commands

```bash
# Development
pnpm dev                  # Start dev server on :3000

# Testing (CRITICAL before commits!)
pnpm typecheck            # Must pass!
pnpm test                 # Unit tests
pnpm test:e2e             # E2E tests
pnpm build                # Production build

# Code Quality
pnpm lint                 # ESLint
pnpm format               # Prettier
```

---

**Note**: This file provides Next.js-specific patterns. For project-wide standards (state management, styling, type safety), see [root CLAUDE.md](../../CLAUDE.md).
