# FROK Project - Claude Code Documentation

Last Updated: 2025-10-29 (Session #4)

## Project Overview

FROK is a full-stack AI-powered personal assistant application built with modern web technologies. The project uses a monorepo architecture managed with Turbo + pnpm.

### Tech Stack

- **Frontend**: Next.js 15.5.5 (App Router), React 19.2.0, TypeScript 5.9.3
- **Backend**: Fastify 5.6.1, Supabase (Auth + Database)
- **AI**: OpenAI GPT-5 (think, mini, nano variants), ChatKit, Whisper API, Vision API
- **Styling**: Tailwind CSS 4.1.14 with CSS custom properties
- **State**: Zustand 5.0.8 + localStorage, TanStack Query 5.90.3
- **Monorepo**: Turbo 2.5.8 + pnpm 10.18.2
- **Form Validation**: React Hook Form 7.65.0 + Zod
- **Performance**: web-vitals 5.1.0, ISR, Code Splitting

## Recent Major Changes

### Session #4: TypeScript Override Modifier Fix + Comprehensive Normalization Audit (Latest)

**1. ErrorBoundary Override Modifiers (Completed)**
- Fixed TypeScript errors in `apps/web/src/components/ErrorBoundary.tsx`
- Added `override` keyword to `componentDidCatch()` and `render()` methods
- These errors were caused by the `noImplicitOverride` compiler option added in Session #3
- Location: apps/web/src/components/ErrorBoundary.tsx:27, :42

**2. Production Build Verification (Completed)**
- Confirmed production build compiles successfully
- All immediate tasks from Session #3 completed

**3. Comprehensive Normalization Audit (Completed)**
- Conducted full-stack audit of codebase consistency, modularity, and maintainability
- Identified **critical architecture gaps** preventing production readiness
- Created detailed normalization plan: `NORMALIZATION_PLAN.md`
- **Key Findings**:
  - ❌ **State management not implemented** (Zustand/TanStack Query installed but unused)
  - ❌ **No authentication** on API routes (all use hardcoded DEMO_USER_ID)
  - ❌ **46% of API routes** use `any` types
  - ❌ **Component duplication** (Toast, AppShell, SideNav)
  - ❌ **Missing accessibility** (90% of interactive elements lack ARIA labels)
  - ❌ **Inconsistent error handling** (29 files use `catch (e: any)`)
- **Impact**: Created 4-phase normalization plan (6-8 weeks) to address issues
- See `NORMALIZATION_PLAN.md` for full details and implementation timeline

### Session #3: Future Improvements Implementation

**1. Enhanced TypeScript Configuration (Completed)**
- Added stricter compiler options to `tsconfig.base.json`:
  - `noUncheckedIndexedAccess`: Prevents unsafe array/object access
  - `noImplicitOverride`: Requires explicit override keyword
  - `noPropertyAccessFromIndexSignature`: Safer property access
  - `noFallthroughCasesInSwitch`: Prevents switch fallthrough bugs
  - `noUnusedLocals` & `noUnusedParameters`: Catches unused code
  - `forceConsistentCasingInFileNames`: Ensures consistent imports

**2. Type Safety Improvements (Completed)**
- Created `apps/web/src/types/database.ts` with proper database row types
- Fixed `any` types in core files:
  - `lib/errorHandler.ts`: Changed `any` to `unknown` and `never[]`
  - `lib/chatRepo.ts`: Added proper `ChatThreadRow` and `ChatMessageRow` types
  - `app/dashboard/page.tsx`: Fixed type guard for API responses
- Replaced unsafe type assertions with proper type checking

**3. Request Memoization (Completed)**
- Created `lib/cache.ts` with type-safe caching utilities:
  - `Cache<T>` class with TTL and max size support
  - `memoize()` function for caching async functions
  - `createCachedFetcher()` for React data fetching
- Dashboard pages already using Next.js ISR caching (30s revalidation)

**4. React Server Components (Completed)**
- Dashboard pages already using async Server Components
- Using Next.js fetch with ISR for optimal performance
- Proper data fetching patterns with revalidation times

**5. Keyboard Navigation & Accessibility (Completed)**
- Created `hooks/useKeyboardShortcut.ts`:
  - Hook for handling keyboard shortcuts
  - Support for Ctrl, Shift, Alt, Meta modifiers
  - `useKeyboardShortcuts()` for multiple shortcuts
  - Common shortcuts constants (save, close, search, etc.)
- Created `hooks/useFocusManagement.ts`:
  - `useFocusTrap()`: Traps focus within modals/dialogs
  - `useFocusReturn()`: Restores focus on close
  - `useAutoFocus()`: Auto-focuses elements on mount
  - `useListFocus()`: Arrow key navigation in lists
  - Utility functions for finding focusable elements
- Enhanced `ConfirmDialog` component:
  - Auto-focus on cancel button when opened
  - Focus trap with Tab key cycling
  - Restores focus to previous element on close
  - Already had Escape key support

### Session #2: App Cleanup & Restructure

**1. App Cleanup & File Deletion (Completed)**
- 18 obsolete files removed:
  - 10 redirect pages (users, devices, finances, system, smart-home, automation)
  - 3 deprecated n8n API routes
  - 5 unused components/files
- 8 empty directories removed

**2. Type Safety Fixes (Completed)**
- Fixed ConfirmDialog Button variant types
- Updated github/page.tsx to use Card from @frok/ui

**3. Navigation Restructure (Session #1)**
- Changed main landing page from `/chat` to `/dashboard`
- Added auth controls to SideNav component
- Created persistent navigation across all endpoints
- Fixed mobile navigation implementation
- Resolved button overlap issues on /agent page

**4. /Agent Page Improvements (Session #1)**
- Redesigned header with gradient background and better UX
- Added "Quick Navigation" section to thread sidebar
- Implemented icon-first responsive button design
- Added density toggle and improved export menu

## Project Structure

```
C:\Dev\FROK\
├── apps/
│   ├── web/              # Next.js main web application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (main)/
│   │   │   │   │   ├── agent/page.tsx          # AI agent chat interface
│   │   │   │   │   └── page.tsx                # Redirects to /dashboard
│   │   │   │   ├── dashboard/                  # Main dashboard pages
│   │   │   │   │   ├── layout.tsx              # Dashboard layout with SideNav
│   │   │   │   │   ├── DashboardNav.tsx       # Dashboard navigation component
│   │   │   │   │   └── [pages]/               # Dashboard sub-pages
│   │   │   │   ├── auth/                      # Auth pages (sign-in, sign-up)
│   │   │   │   └── api/                       # API routes
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── hooks/
│   │   └── next.config.ts
│   ├── api/              # Fastify backend API
│   ├── cli/              # CLI tools
│   ├── ui-docs/          # Storybook documentation
│   └── workers/          # Background workers
├── packages/
│   ├── ui/               # Shared UI components library
│   │   └── src/components/
│   │       ├── SideNav.tsx                    # Main navigation component
│   │       ├── Button.tsx                     # Button component (primary/outline/ghost)
│   │       ├── Card.tsx                       # Card component
│   │       ├── ConfirmDialog.tsx              # Confirmation modal
│   │       ├── ChatSidebar.tsx                # Thread list sidebar
│   │       ├── Form.tsx                       # Form field components
│   │       └── ...
│   ├── clients/          # API clients
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   └── db/               # Database schema & migrations
└── services/
    └── agents/           # AI agent services

```

## Key Files & Their Purpose

### Core Configuration
- `apps/web/next.config.ts` - Next.js configuration (image optimization, rewrites)
- `apps/web/src/app/layout.tsx` - Root layout with providers
- `turbo.json` - Turbo monorepo configuration

### Navigation & Layout
- `packages/ui/src/components/SideNav.tsx` - Main navigation component with mobile support
  - Supports auth controls (userEmail, onSignIn, onSignOut)
  - Mobile responsive with hamburger menu
  - Collapsible sidebar
  - Active link highlighting
- `apps/web/src/app/dashboard/layout.tsx` - Dashboard layout wrapper
- `apps/web/src/app/dashboard/DashboardNav.tsx` - Dashboard navigation with useAuth integration

### Agent Interface
- `apps/web/src/app/(main)/agent/page.tsx` - AI agent chat page
  - Dynamic imports for heavy modal components
  - Quick Navigation sidebar section
  - Redesigned header with gradient and better UX

### Performance Monitoring
- `apps/web/src/components/WebVitals.tsx` - Core Web Vitals tracking (CLS, LCP, FCP, TTFB, INP)
- `apps/web/src/app/api/analytics/vitals/route.ts` - Web Vitals collection endpoint

### Error Handling
- `apps/web/src/lib/errorHandler.ts` - Centralized error handler singleton
- `apps/web/src/components/ErrorBoundary.tsx` - React error boundary

## Dashboard Pages

All dashboard pages follow ISR pattern with appropriate revalidation times:

- `/dashboard` - Main dashboard (30s revalidation) - apps/web/src/app/dashboard/page.tsx
- `/dashboard/profile` - User profile
- `/dashboard/system` - System status
- `/dashboard/users` - User management
- `/dashboard/smart-home` - Smart home controls (15s revalidation)
- `/dashboard/health` - Health metrics
- `/dashboard/development` - Dev tools
- `/dashboard/automation` - Automation workflows
- `/dashboard/finances` - Financial data (60s revalidation)
- `/agent` - AI agent chat interface

## Authentication

### Current Implementation
- Supabase Auth integration
- Auth controls in SideNav (userEmail, onSignIn, onSignOut props)
- useAuth hook: `apps/web/src/lib/useAuth.ts`
- Protected routes via middleware
- Sign-in redirect: `/auth/sign-in`

## Utilities & Hooks

### Cache Utility (apps/web/src/lib/cache.ts)
Type-safe in-memory caching with TTL support:

```typescript
import { Cache, memoize, createCachedFetcher } from '@/lib/cache';

// Basic cache usage
const cache = new Cache<string>({ ttl: 60000, maxSize: 100 });
cache.set('key', 'value');
const value = cache.get('key'); // Returns null if expired

// Memoize async functions
const fetchUser = memoize(
  async (userId: string) => fetch(`/api/users/${userId}`).then(r => r.json()),
  { ttl: 30000, keyFn: (userId) => `user:${userId}` }
);

// Cached data fetcher
const getCachedData = createCachedFetcher(
  () => fetch('/api/data').then(r => r.json()),
  'data-key',
  30000
);
```

### Keyboard Shortcuts (apps/web/src/hooks/useKeyboardShortcut.ts)

```typescript
import { useKeyboardShortcut, useKeyboardShortcuts, commonShortcuts } from '@/hooks/useKeyboardShortcut';

// Single shortcut
useKeyboardShortcut({ key: 's', ctrl: true }, () => {
  handleSave();
});

// Multiple shortcuts
useKeyboardShortcuts([
  { shortcut: commonShortcuts.save, handler: handleSave },
  { shortcut: commonShortcuts.close, handler: handleClose },
  { shortcut: { key: 'k', ctrl: true }, handler: openSearch },
]);
```

### Focus Management (apps/web/src/hooks/useFocusManagement.ts)

```typescript
import {
  useFocusTrap,
  useFocusReturn,
  useAutoFocus,
  useListFocus
} from '@/hooks/useFocusManagement';

// Focus trap for modals
function Modal({ isOpen }) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  return <div ref={modalRef}>...</div>;
}

// Restore focus on unmount
function Dialog() {
  const { saveFocus, restoreFocus } = useFocusReturn();

  useEffect(() => {
    saveFocus();
    return () => restoreFocus();
  }, []);
}

// Auto-focus element
function SearchInput() {
  const inputRef = useAutoFocus<HTMLInputElement>();
  return <input ref={inputRef} />;
}

// List navigation with arrow keys
function Dropdown() {
  const { containerRef } = useListFocus({ loop: true });
  return (
    <div ref={containerRef}>
      <button role="option">Item 1</button>
      <button role="option">Item 2</button>
    </div>
  );
}
```

## UI Components (packages/ui)

### Button Component
**Variants**: `primary` | `outline` | `ghost`
**Sizes**: `sm` | `md` | `lg`
**Location**: `packages/ui/src/components/Button.tsx`
**Features**: ForwardRef support, focus-visible ring

### SideNav Component
**Props**:
- items: NavItem[]
- header?: ReactNode
- footer?: ReactNode
- activeHref?: string
- collapsible?: boolean
- linkComponent?: React.ElementType
- mobileBreakpoint?: 'md' | 'lg'
- userEmail?: string | null
- onSignIn?: () => void
- onSignOut?: () => void

**Features**:
- Mobile responsive with hamburger menu
- Collapsible sidebar on desktop
- Active link highlighting
- Disabled items for separators
- Auth controls integration

### ConfirmDialog Component
**Usage**:
```typescript
import { useConfirmDialog } from '@frok/ui';

const { confirm, dialog } = useConfirmDialog();

// Show confirmation
await confirm({
  title: 'Delete Item',
  description: 'Are you sure?',
  confirmLabel: 'Delete',
  variant: 'danger',
  onConfirm: async () => { /* delete logic */ }
});

// Render in JSX
{dialog}
```

**Variants**: `danger` | `warning` | `info`

## Performance Optimizations

### 1. ISR (Incremental Static Regeneration)
- Dashboard pages use ISR with appropriate revalidation times
- Smart home: 15s
- Main dashboard: 30s
- Finances: 60s

### 2. Code Splitting
- Agent page modals use dynamic imports
- Lazy loading for heavy components (ThreadOptionsMenu, TTSSettingsModal, etc.)

### 3. Image Optimization
- Next.js Image component configured
- AVIF/WebP formats
- Responsive device sizes

### 4. Web Vitals Monitoring
- Tracks CLS, LCP, FCP, TTFB, INP
- Development: Console logging
- Production: Sends to `/api/analytics/vitals`

## Common Issues & Solutions

### Issue 1: Button Variant Type Errors
**Problem**: ConfirmDialog using non-existent Button variants
**Solution**: Button only supports 'primary', 'outline', 'ghost' variants
**Location**: packages/ui/src/components/Button.tsx:3

### Issue 2: Card Import Errors
**Problem**: Importing Card from `@/components/ui/card` (deleted file)
**Solution**: Import from `@frok/ui` instead
```typescript
// ✗ Wrong
import { Card } from '@/components/ui/card';

// ✓ Correct
import { Card } from '@frok/ui';
```

### Issue 3: Navigation Not Visible
**Problem**: CSS class conflicts (hidden + flex simultaneously)
**Solution**: Conditional class application based on mobile state
**Location**: packages/ui/src/components/SideNav.tsx:88-98

## Development Workflow

### Starting the Dev Server
```bash
pnpm install
pnpm run dev
```

### Building for Production
```bash
pnpm run build
```

### Running Tests
```bash
pnpm test
```

### Adding a New Dashboard Page
1. Create page file in `apps/web/src/app/dashboard/[page-name]/page.tsx`
2. Add nav item to `apps/web/src/app/dashboard/layout.tsx` nav array
3. Implement ISR if needed: `export const revalidate = 30;`
4. Use AppShell layout pattern for consistency

### Adding a New UI Component
1. Create component in `packages/ui/src/components/[ComponentName].tsx`
2. Export from `packages/ui/src/index.ts`
3. Add Storybook story in `apps/ui-docs/stories/`
4. Use TypeScript for props interface
5. Include 'use client' directive if needed

## Environment Variables

Required environment variables (`.env.local`):
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# API
NEXT_PUBLIC_API_URL=
```

## Coding Standards & Best Practices

> **📌 IMPORTANT**: Following the comprehensive audit in Session #4, these standards must be followed for all new code. See `NORMALIZATION_PLAN.md` for migration of existing code.

### State Management

**When to use what**:
- **Zustand**: Global client state that needs persistence (chat threads, user preferences, TTS settings)
- **TanStack Query**: Server data fetching, caching, and synchronization
- **useState**: Component-local UI state (toggles, form inputs, ephemeral state)
- **URL State**: Filters, search queries, pagination (bookmarkable state)

**Examples**:
```typescript
// ✅ Correct - Chat state in Zustand store
const { messages, addMessage } = useChatStore();

// ✅ Correct - Server data with TanStack Query
const { data: threads } = useQuery({ queryKey: ['threads'], queryFn: fetchThreads });

// ✅ Correct - UI state in component
const [isModalOpen, setIsModalOpen] = useState(false);

// ✅ Correct - Filters in URL
const [filters, setFilters] = useUrlState({ search: '', page: 1 });
```

### Component Development

**Exports**: Always use **named exports**
```typescript
// ❌ Wrong
export default function Button() { ... }

// ✅ Correct
export function Button() { ... }
```

**Prop Types**: Use descriptive names and export them
```typescript
// ❌ Wrong
type Props = { onClick: () => void }

// ✅ Correct
export type ButtonProps = { onClick: () => void }
```

**Component Location**:
- Generic, reusable → `packages/ui/src/components/`
- App-specific → `apps/web/src/components/`
- Feature-specific → `apps/web/src/app/[feature]/components/`

**Always use UI components** from `@frok/ui`:
```typescript
// ❌ Wrong
<button className="...">Click me</button>
<input type="text" className="..." />

// ✅ Correct
import { Button, Input } from '@frok/ui';
<Button>Click me</Button>
<Input type="text" />
```

### Styling Standards

**Always use CSS variables** instead of hardcoded colors:
```typescript
// ❌ Wrong
className="bg-gray-900 text-gray-400 border-gray-700"

// ✅ Correct
className="bg-surface text-foreground/70 border-border"
```

**Available CSS variables**:
- Colors: `--color-primary`, `--color-accent`, `--color-surface`, `--color-border`
- Semantic: `--color-success`, `--color-danger`, `--color-warning`
- Text: `--color-foreground`, `--color-foreground-muted`

### API Route Standards

**Authentication**: All routes must use auth middleware
```typescript
// ❌ Wrong
export async function POST(req: NextRequest) {
  const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';
  // ...
}

// ✅ Correct
export async function POST(req: NextRequest) {
  const user = await withAuth(req);
  if (!user.ok) return user.response;
  // ...
}
```

**Validation**: Use Zod schemas for all inputs
```typescript
// ❌ Wrong
const body = await req.json();
const { title, content } = body;

// ✅ Correct
const body = await withValidation(CreatePostSchema)(req);
if (!body.ok) return body.response;
const { title, content } = body.data;
```

**Error Handling**: Use typed errors, never `any`
```typescript
// ❌ Wrong
try {
  // ...
} catch (e: any) {
  console.error(e);
  return NextResponse.json({ error: e.message }, { status: 200 });
}

// ✅ Correct
try {
  // ...
} catch (error: unknown) {
  errorHandler.logError({
    message: error instanceof Error ? error.message : 'Unknown error',
    context: { route: '/api/example' },
  });
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```

**Response Format**: Consistent structure
```typescript
// Success
return NextResponse.json({ ok: true, data: result }, { status: 200 });

// Error
return NextResponse.json({ ok: false, error: 'error_code', details: {...} }, { status: 400 });
```

### Accessibility Requirements

All interactive elements must have proper ARIA labels:
```typescript
// ❌ Wrong
<button onClick={onClose}>×</button>

// ✅ Correct
<button onClick={onClose} aria-label="Close modal">×</button>
```

All modals must have:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` and `aria-describedby`
- Focus trap (use `useFocusTrap` hook)
- Escape key handler

### Type Safety

**Never use `any`** - use `unknown` for truly unknown types:
```typescript
// ❌ Wrong
const data: any = await fetchSomething();

// ✅ Correct
const data: unknown = await fetchSomething();
if (isValidData(data)) {
  // Type narrowing
}
```

**Database types**: Import from `@/types/database.ts`
```typescript
import type { ChatThreadRow, ChatMessageRow } from '@/types/database';
```

## Known Limitations

1. **Build Performance**: Production builds can be slow due to large codebase
2. **Legacy API Routes**: 29 API routes still use `any` types (will be addressed incrementally)
   - See `NORMALIZATION_PLAN.md` Phase 2.2 for migration plan
3. **Testing Coverage**: E2E test framework not yet configured
   - Some unit tests exist (chatStore.test.ts, base.test.ts)
4. **State Management**: Zustand stores need to be implemented (see `NORMALIZATION_PLAN.md` Phase 1.1)
5. **Authentication**: API routes currently use hardcoded user ID (see `NORMALIZATION_PLAN.md` Phase 2.1)

## Next Steps & Recommendations

### Immediate Tasks (All Completed - Session #4)
1. ✅ Clean up unused files (Completed - Session #2)
2. ✅ Fix type errors (Completed - Session #2, #3, #4)
3. ✅ Complete production build verification (Completed - Session #4)
4. ⏳ E2E tests - No test framework currently configured (deferred to future work)

### Completed Improvements (Session #3)
✅ **Performance**:
   - Dashboard pages using React Server Components
   - ISR caching with appropriate revalidation times
   - Created type-safe memoization utilities

✅ **Type Safety**:
   - Stricter TypeScript configuration enabled
   - Core files migrated from `any` to proper types
   - Created database row type definitions

✅ **Accessibility**:
   - Keyboard shortcut hooks implemented
   - Focus management hooks created
   - ConfirmDialog enhanced with focus trap

### Remaining Future Work
1. **Testing**:
   - Add unit tests for UI components
   - Implement E2E tests for critical user flows
   - Add visual regression testing with Chromatic

2. **Advanced Type Safety**:
   - Consider using Zod for runtime type validation
   - Migrate remaining API route `any` types
   - Add generics to Supabase client wrappers

3. **Performance Optimizations**:
   - Consider route-based code splitting for rarely used pages
   - Implement React Query for client-side data fetching
   - Add service worker for offline support

## Troubleshooting

### Build Fails with Module Not Found
1. Run `pnpm install` to ensure all dependencies are installed
2. Check if file was recently deleted - update imports
3. Clear `.next` cache: `rm -rf apps/web/.next`

### SideNav Not Showing on Mobile
1. Check that mobileBreakpoint prop is set correctly
2. Verify no conflicting CSS classes
3. Ensure React state updates properly

### Auth Not Working
1. Check Supabase environment variables
2. Verify useAuth hook is imported correctly
3. Check browser console for auth errors
4. Ensure middleware is configured in `apps/web/middleware.ts`

## Contact & Resources

- **GitHub**: [Project Repository URL]
- **Documentation**: This file + Storybook at `http://localhost:6006`
- **API Docs**: Fastify Swagger at `/documentation`

---

**Note**: This documentation reflects the state of the project as of Session #4. All immediate tasks are complete. Production build verified and functional.

## 🚨 Before Starting New Features

**CRITICAL**: A comprehensive audit in Session #4 identified architectural gaps that must be addressed before production deployment. See `NORMALIZATION_PLAN.md` for:

- **Phase 1 (CRITICAL)**: State management foundation, component deduplication, error handling
- **Phase 2 (SECURITY)**: Authentication, type safety, request validation, rate limiting
- **Phase 3 (UI/UX)**: Component standardization, CSS variables, accessibility
- **Phase 4 (ARCHITECTURE)**: TanStack Query, URL state, utility extraction

**Estimated effort**: 6-8 weeks across 4 phases

**New code must follow** the "Coding Standards & Best Practices" section above to prevent regression.
