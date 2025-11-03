# FROK Normalization & Modernization Plan

**Generated**: 2025-10-29 (Session #4)
**Updated**: 2025-10-30 (Session #5)
**Status**: ✅ **PHASES 1-4 COMPLETE** - Ready for new feature development
**Completed**: Session #4 (Phases 1-4) + Session #5 (Memory System)

---

## Executive Summary

**✅ ALL PHASES COMPLETE** - The comprehensive normalization plan has been fully implemented across Sessions #4 and #5.

### Original Issues (RESOLVED)
- ✅ **State management** - Zustand stores implemented with localStorage persistence
- ✅ **Authentication** - All API routes now require authentication
- ✅ **Type safety** - `any` types eliminated from critical routes
- ✅ **Component duplication** - All duplicates removed
- ✅ **Accessibility** - ARIA labels, keyboard navigation, focus management
- ✅ **Architecture** - TanStack Query, URL state management, utility functions
- ✅ **Memory System** - Backend/frontend integration with proper security

### Latest Updates (Session #5)
- ✅ Memory API routes secured with authentication
- ✅ User isolation implemented for all memory operations
- ✅ TanStack Query migration for memory components
- ✅ Add Memory UI feature implemented
- ✅ Production deployment successful on Vercel

---

## 🔴 PHASE 1: CRITICAL FIXES (Week 1-2)

### Priority: Block all non-essential feature work until complete

### 1.1 State Management Foundation

**Problem**: Zustand/TanStack Query listed in tech stack but completely unused.

**Tasks**:
- [ ] Create `apps/web/src/store/` directory structure
- [ ] Implement `chatStore.ts` (referenced by broken test)
  - State: threads, messages, activeThreadId, files, settings
  - Actions: addMessage, updateThread, clearMessages
  - Persistence: localStorage with 7-day TTL
- [ ] Implement `ttsStore.ts`
  - State: voice, speed, enabled, autoPlay
  - Persistence: localStorage
- [ ] Implement `userPreferencesStore.ts`
  - State: sidebarCollapsed, density, theme
  - Persistence: localStorage
- [ ] Fix broken test: `apps/web/tests/chatStore.test.ts`
- [ ] Document Zustand patterns in CLAUDE.md

**Files Created**:
```
apps/web/src/store/
├── index.ts              # Export all stores
├── chatStore.ts          # Chat/agent state
├── ttsStore.ts           # TTS preferences
└── userPreferencesStore.ts  # UI preferences
```

**Acceptance Criteria**:
- ✅ Test suite passes
- ✅ Agent page state persists across refreshes
- ✅ All stores have TypeScript types
- ✅ DevTools integration working

---

### 1.2 Component Deduplication

**Problem**: 3 duplicate components causing confusion and bugs.

**Tasks**:
- [ ] Delete `apps/web/src/components/Toast.tsx`
- [ ] Delete `apps/web/src/components/layout/AppShell.tsx`
- [ ] Delete `apps/web/src/components/layout/SideNav.tsx`
- [ ] Delete `apps/web/src/hooks/useToast.ts`
- [ ] Update all imports to use `@frok/ui` versions:
  - [ ] `apps/web/src/app/(main)/agent/page.tsx` (Toast)
  - [ ] Find all AppShell imports and update
- [ ] Delete empty directory: `apps/web/src/components/ui/`

**Affected Files**: 5 deletions, 3-5 import updates

**Acceptance Criteria**:
- ✅ No duplicate components remain
- ✅ All imports resolve correctly
- ✅ Build passes without errors
- ✅ Toast notifications work consistently

---

### 1.3 Error Handling Standardization

**Problem**: 29 files use `catch (e: any)` violating strict TypeScript config.

**Tasks**:
- [ ] Update error handler to accept `unknown`:
  ```typescript
  // lib/errorHandler.ts
  export function handleError(error: unknown): ErrorDetails {
    if (error instanceof Error) { ... }
    return { message: String(error), ... }
  }
  ```
- [ ] Replace all `catch (e: any)` with `catch (error: unknown)`
- [ ] Use errorHandler.logError() in all catch blocks
- [ ] Create API middleware wrapper:
  ```typescript
  // lib/api/withErrorHandler.ts
  export function withErrorHandler(handler: RouteHandler) {
    return async (req: NextRequest) => {
      try {
        return await handler(req);
      } catch (error: unknown) {
        errorHandler.logError({ ... });
        return NextResponse.json({ error: ... }, { status: 500 });
      }
    }
  }
  ```

**Files Affected**: 29 files

**Acceptance Criteria**:
- ✅ No `catch (e: any)` remain
- ✅ All API routes use error middleware
- ✅ Errors logged with context (route, user, timestamp)
- ✅ TypeScript strict mode passes

---

## 🟠 PHASE 2: SECURITY & TYPE SAFETY (Week 3-4)

### Priority: Production blockers - must complete before deployment

### 2.1 API Authentication

**Problem**: NO authentication on any routes; all use hardcoded DEMO_USER_ID.

**Tasks**:
- [ ] Create auth middleware: `lib/api/withAuth.ts`
  ```typescript
  export async function withAuth(req: NextRequest) {
    const supabase = getSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return user;
  }
  ```
- [ ] Remove all instances of `DEMO_USER_ID` (6 files)
- [ ] Wrap all protected routes with auth middleware
- [ ] Update Supabase RLS policies for user isolation
- [ ] Add auth checks to:
  - [ ] /api/chat/* (threads, messages)
  - [ ] /api/agent/* (run, stream, memory)
  - [ ] /api/memory/* (add, search, list)
  - [ ] /api/finances/* (all routes)

**Files Affected**: 20+ API routes

**Security Impact**: 🔴 **CRITICAL** - Prevents unauthorized access

**Acceptance Criteria**:
- ✅ All routes require valid session
- ✅ Users can only access their own data
- ✅ Proper 401 errors for unauthenticated requests
- ✅ RLS policies tested

---

### 2.2 API Type Safety (Finances)

**Problem**: Financial routes use `any` types for money calculations.

**Tasks**:
- [ ] Create type definitions:
  ```typescript
  // types/finances.ts
  export type Transaction = {
    id: string;
    account_id: string;
    category_id: string | null;
    amount: number;
    currency: string;
    date: string;
    description: string;
  }

  export type Account = { ... }
  export type Category = { ... }
  ```
- [ ] Replace `any[]` with proper types in:
  - [ ] `api/finances/summary/route.ts` (lines 26, 28, 33, 46, 47)
  - [ ] `api/finances/transactions/route.ts` (lines 32, 33, 47, 49, 51)
  - [ ] `api/finances/import/route.ts`
- [ ] Add runtime validation with Zod schemas
- [ ] Test edge cases (null amounts, missing fields)

**Files Affected**: 5 finance routes

**Acceptance Criteria**:
- ✅ No `any` types in finance code
- ✅ Zod schemas validate all inputs
- ✅ Money calculations type-safe
- ✅ Tests cover edge cases

---

### 2.3 Request Validation with Zod

**Problem**: Zod installed but unused; no request validation.

**Tasks**:
- [ ] Create schema directory: `apps/web/src/schemas/`
- [ ] Define schemas for each API route:
  ```typescript
  // schemas/chat.ts
  export const CreateThreadSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    model: z.enum(['think', 'mini', 'nano']),
    tools_enabled: z.boolean().default(false),
  });

  export const SendMessageSchema = z.object({
    thread_id: z.string().uuid(),
    content: z.string().min(1).max(10000),
    file_urls: z.array(z.string().url()).optional(),
  });
  ```
- [ ] Create validation middleware:
  ```typescript
  // lib/api/withValidation.ts
  export function withValidation<T>(schema: z.Schema<T>) {
    return async (req: NextRequest) => {
      const body = await req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return NextResponse.json({
          error: 'validation_error',
          details: result.error.format()
        }, { status: 400 });
      }
      return result.data;
    }
  }
  ```
- [ ] Apply to all POST/PATCH routes (20+ routes)

**Files Created**: 5-7 schema files, 1 middleware file

**Acceptance Criteria**:
- ✅ All routes validate input
- ✅ Clear validation error messages
- ✅ Type inference from schemas
- ✅ Tests for invalid inputs

---

### 2.4 Rate Limiting

**Problem**: No rate limiting on expensive operations (AI, external APIs).

**Tasks**:
- [ ] Install `@upstash/ratelimit` or `express-rate-limit`
- [ ] Create rate limit middleware:
  ```typescript
  // lib/api/withRateLimit.ts
  export const rateLimits = {
    ai: ratelimit({ requests: 20, window: '1m' }),
    api: ratelimit({ requests: 100, window: '1m' }),
    upload: ratelimit({ requests: 10, window: '1m' }),
  }
  ```
- [ ] Apply to expensive routes:
  - [ ] `/api/agent/stream` (20/min per user)
  - [ ] `/api/agent/run` (20/min per user)
  - [ ] `/api/transcribe` (10/min per user)
  - [ ] `/api/chat` (50/min per user)
- [ ] Return 429 with retry-after header

**Acceptance Criteria**:
- ✅ AI routes rate limited
- ✅ Proper 429 responses
- ✅ Rate limits configurable via env vars
- ✅ Tests verify limits enforced

---

## 🟡 PHASE 3: UI/UX CONSISTENCY (Week 5-6)

### Priority: High - Improves maintainability and user experience

### 3.1 Component Standardization

**Problem**: 100+ raw `<button>` elements instead of Button component.

**Tasks**:
- [ ] Create utility script to find/replace:
  ```bash
  # Find all raw buttons
  grep -r "<button" apps/web/src --include="*.tsx" > raw-buttons.txt
  ```
- [ ] Replace raw buttons in priority order:
  1. [ ] `agent/page.tsx` (50+ buttons) - **CRITICAL PATH**
  2. [ ] Auth pages (sign-in, callback)
  3. [ ] Modal components (UserMemories, AgentMemory, TTSSettings)
  4. [ ] Dashboard quick actions
  5. [ ] Smart home components
- [ ] Replace raw `<input>` with Input component (10+ instances)
- [ ] Create linting rule to prevent future violations:
  ```json
  // .eslintrc.json
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "JSXElement[openingElement.name.name='button']",
        "message": "Use <Button> from @frok/ui instead of raw <button>"
      }
    ]
  }
  ```

**Files Affected**: 15+ files

**Acceptance Criteria**:
- ✅ <95% of buttons use Button component
- ✅ Consistent variants applied
- ✅ ESLint enforces pattern
- ✅ Visual consistency verified

---

### 3.2 CSS Variable Migration

**Problem**: 14 files use hardcoded Tailwind colors vs CSS variables.

**Tasks**:
- [ ] Document color mapping:
  ```markdown
  ## Color Migration Guide

  | Old (Hardcoded)      | New (CSS Variable)           |
  |----------------------|------------------------------|
  | bg-gray-900          | bg-surface                   |
  | bg-gray-800          | bg-surface/80                |
  | text-gray-400        | text-foreground/70           |
  | border-gray-700      | border-border                |
  | bg-sky-500           | bg-primary                   |
  | bg-red-500           | bg-danger                    |
  ```
- [ ] Create migration script:
  ```typescript
  // scripts/migrate-colors.ts
  const replacements = {
    'bg-gray-900': 'bg-surface',
    'bg-gray-800': 'bg-surface/80',
    // ...
  }
  ```
- [ ] Migrate files in order:
  1. [ ] `agent/page.tsx` - Most visible
  2. [ ] Modal components (4 files)
  3. [ ] Dashboard components
  4. [ ] Smart home components
- [ ] Update ErrorBoundary to use consistent colors
- [ ] Add Tailwind safelist for CSS variable classes

**Files Affected**: 14 files, ~200 replacements

**Acceptance Criteria**:
- ✅ No hardcoded gray-* colors remain
- ✅ Theming works globally
- ✅ Visual consistency maintained
- ✅ Documentation updated

---

### 3.3 Accessibility Improvements

**Problem**: Missing ARIA labels on 90% of interactive elements.

**Tasks**:
- [ ] Audit all buttons for missing labels:
  ```typescript
  // Bad
  <button onClick={onClose}>×</button>

  // Good
  <button onClick={onClose} aria-label="Close modal">×</button>
  ```
- [ ] Add ARIA labels to:
  - [ ] All close buttons (10+ instances)
  - [ ] Icon-only buttons (20+ instances)
  - [ ] QuickActions component
  - [ ] ThreadOptionsMenu
- [ ] Add role/aria attributes to modals:
  ```tsx
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
  ```
- [ ] Apply focus trap to all modals (use ConfirmDialog pattern)
- [ ] Run automated accessibility audit:
  ```bash
  npm install --save-dev @axe-core/react
  ```

**Files Affected**: 10+ component files

**Acceptance Criteria**:
- ✅ All interactive elements labeled
- ✅ Keyboard navigation works
- ✅ Focus traps on modals
- ✅ Axe audit passes (0 violations)

---

### 3.4 Shared Modal Component

**Problem**: 4 modals duplicate identical overlay/wrapper pattern.

**Tasks**:
- [ ] Create `packages/ui/src/components/Modal.tsx`:
  ```typescript
  export type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    children: React.ReactNode;
    footer?: React.ReactNode;
  }

  export function Modal({ isOpen, onClose, title, children, ...props }: ModalProps) {
    const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      if (isOpen) window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          className={`bg-surface border-border rounded-lg p-6 max-w-${maxWidth} w-full mx-4`}
        >
          {title && <h2 id="modal-title">{title}</h2>}
          {children}
        </div>
      </div>
    );
  }
  ```
- [ ] Refactor existing modals to use Modal:
  - [ ] UserMemoriesModal.tsx
  - [ ] AgentMemoryModal.tsx
  - [ ] TTSSettings.tsx
  - [ ] ThreadOptionsMenu.tsx
- [ ] Add Modal to Storybook
- [ ] Export from `packages/ui/src/index.ts`

**Files Affected**: 5 files (1 new, 4 refactored)

**Acceptance Criteria**:
- ✅ All modals use shared component
- ✅ Consistent behavior (ESC, focus trap, overlay click)
- ✅ Customizable sizes
- ✅ Storybook documentation

---

## 🟢 PHASE 4: ARCHITECTURE IMPROVEMENTS (Week 7-8)

### Priority: Medium - Improves developer experience and scalability

### 4.1 TanStack Query Migration

**Problem**: TanStack Query installed but unused; manual fetch everywhere.

**Tasks**:
- [ ] Create query hooks directory: `apps/web/src/hooks/queries/`
- [ ] Create hooks for agent page:
  ```typescript
  // hooks/queries/useAgentConfig.ts
  export function useAgentConfig() {
    return useQuery({
      queryKey: ['agent-config'],
      queryFn: async () => {
        const res = await fetch('/api/agent/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        return res.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }

  // hooks/queries/useThreads.ts
  export function useThreads() {
    return useQuery({
      queryKey: ['threads'],
      queryFn: fetchThreads,
      staleTime: 30 * 1000,
    });
  }

  // hooks/queries/useMessages.ts
  export function useMessages(threadId: string | null) {
    return useQuery({
      queryKey: ['messages', threadId],
      queryFn: () => threadId ? fetchMessages(threadId) : null,
      enabled: !!threadId,
    });
  }
  ```
- [ ] Create mutation hooks:
  ```typescript
  // hooks/mutations/useSendMessage.ts
  export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data: SendMessageData) => {
        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.json();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['messages', variables.thread_id]
        });
      },
    });
  }
  ```
- [ ] Replace manual fetches in:
  - [ ] `agent/page.tsx` (highest priority)
  - [ ] `smart-home/SmartHomeView.tsx` (remove manual polling)
  - [ ] `dashboard/DashboardQuickActions.tsx`
  - [ ] `finances/FinancesTransactionsClient.tsx`
- [ ] Remove manual deduplication code (agent page lines 259-266)
- [ ] Remove manual polling code (SmartHomeView)

**Files Created**: 10+ query/mutation hooks

**Acceptance Criteria**:
- ✅ All data fetching uses TanStack Query
- ✅ Loading states simplified
- ✅ Automatic refetching works
- ✅ Cache invalidation on mutations
- ✅ DevTools shows query state

---

### 4.2 URL State Migration

**Problem**: Filter/search state in useState should be URL params.

**Tasks**:
- [ ] Create URL state hook:
  ```typescript
  // hooks/useUrlState.ts
  export function useUrlState<T extends Record<string, any>>(
    defaults: T
  ): [T, (updates: Partial<T>) => void] {
    const router = useRouter();
    const searchParams = useSearchParams();

    const state = useMemo(() => ({
      ...defaults,
      ...Object.fromEntries(searchParams.entries())
    }), [searchParams, defaults]);

    const setState = useCallback((updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
        else params.delete(key);
      });
      router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    return [state, setState];
  }
  ```
- [ ] Migrate agent page filters to URL:
  - [ ] searchQuery → `?search=`
  - [ ] selectedFolder → `?folder=`
  - [ ] selectedTags → `?tags=`
  - [ ] showArchived → `?archived=true`
- [ ] Migrate finances filters to URL:
  - [ ] All filter state (account, category, search, date range)
  - [ ] Pagination offset → `?page=`
- [ ] Update state management: URL = source of truth

**Files Affected**: 2 pages (agent, finances)

**Acceptance Criteria**:
- ✅ Filters persist in URL
- ✅ URLs are shareable/bookmarkable
- ✅ Browser back/forward works
- ✅ State syncs with URL automatically

---

### 4.3 Extract Shared Utilities

**Problem**: Helper functions duplicated across 10+ files.

**Tasks**:
- [ ] Create `lib/api/` utilities directory
- [ ] Extract Home Assistant helper:
  ```typescript
  // lib/api/homeAssistant.ts
  export function getHomeAssistantConfig() {
    const base = (process.env.HOME_ASSISTANT_URL || process.env.HA_BASE_URL || '').trim();
    const token = (process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || '').trim();

    if (!base || !token) {
      throw new Error('Home Assistant config missing');
    }

    return {
      base: base.replace(/\/$/, ''),
      token,
      headers: { Authorization: `Bearer ${token}` }
    };
  }
  ```
- [ ] Consolidate Supabase client patterns:
  ```typescript
  // lib/api/supabase.ts
  export function getAuthenticatedSupabase() {
    // Single pattern for all routes
  }
  ```
- [ ] Create constants file:
  ```typescript
  // lib/constants.ts
  export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';
  export const DEFAULT_MODEL = 'think';
  export const MAX_MESSAGE_LENGTH = 10000;
  ```
- [ ] Replace 10+ instances of `getHA()` with import
- [ ] Replace 6 instances of hardcoded DEMO_USER_ID

**Files Affected**: 15+ API routes

**Acceptance Criteria**:
- ✅ No duplicate helper functions
- ✅ Single source of truth for configs
- ✅ Easier to update logic
- ✅ Better testability

---

### 4.4 Constants & Configuration

**Problem**: Hardcoded arrays and magic values throughout code.

**Tasks**:
- [ ] Create constants directory: `apps/web/src/constants/`
- [ ] Extract QuickActions:
  ```typescript
  // constants/prompts.ts
  export const QUICK_ACTIONS = [
    { icon: Calendar, label: "Today's tasks", prompt: "..." },
    { icon: Lightbulb, label: "Creative ideas", prompt: "..." },
    // ...
  ] as const;

  export const STARTER_PROMPTS = [
    "What's on my calendar today?",
    "Summarize my recent emails",
    // ...
  ] as const;
  ```
- [ ] Extract Memory Types:
  ```typescript
  // constants/memory.ts
  export const MEMORY_TYPES = [
    { id: 'core', name: 'Core Knowledge', description: '...' },
    { id: 'facts', name: 'Facts & Data', description: '...' },
    // ...
  ] as const;
  ```
- [ ] Extract Model Config:
  ```typescript
  // constants/models.ts
  export const AI_MODELS = {
    think: { name: 'GPT-5 Think', maxTokens: 16000 },
    mini: { name: 'GPT-5 Mini', maxTokens: 8000 },
    nano: { name: 'GPT-5 Nano', maxTokens: 4000 },
  } as const;
  ```
- [ ] Update components to import from constants

**Files Created**: 4 constant files

**Acceptance Criteria**:
- ✅ All hardcoded arrays extracted
- ✅ Type-safe with `as const`
- ✅ Easy to modify in one place
- ✅ Documented in CLAUDE.md

---

### 4.5 Export Pattern Standardization

**Problem**: Mixed default/named exports, no index files.

**Tasks**:
- [ ] Convert default exports to named:
  ```typescript
  // Before
  export default function DeviceControls() { ... }

  // After
  export function DeviceControls() { ... }
  ```
- [ ] Update all 7 default export components
- [ ] Create index files:
  ```typescript
  // apps/web/src/components/smart-home/index.ts
  export { DeviceControls } from './DeviceControls';
  export { AreaLightControls } from './AreaLightControls';
  export { SmartHomeView } from './SmartHomeView';
  export { ColorWheel } from './ColorWheel';
  export { SyncButtons } from './SyncButtons';
  ```
- [ ] Update all import statements
- [ ] Rename generic `Props` types:
  ```typescript
  // Before
  type Props = { ... }

  // After
  export type ColorWheelProps = { ... }
  ```

**Files Affected**: 10+ component files

**Acceptance Criteria**:
- ✅ All components use named exports
- ✅ Index files enable grouped imports
- ✅ Prop types descriptively named
- ✅ ESLint enforces pattern

---

## 📊 METRICS & SUCCESS CRITERIA

### Before Normalization (Current State)
- ❌ Zustand stores: 0 (claimed but not implemented)
- ❌ TanStack Query usage: 0 instances
- ❌ API routes with auth: 0%
- ❌ API routes with `any` types: 46%
- ❌ API routes with proper errors: 65%
- ❌ Components using Button: ~15%
- ❌ Files with CSS variables: 60%
- ❌ Interactive elements with ARIA: 10%
- ❌ Duplicate components: 3
- ❌ Test pass rate: 0% (broken chatStore test)

### After Normalization (Target State)
- ✅ Zustand stores: 3+ (chat, tts, preferences)
- ✅ TanStack Query usage: 20+ hooks
- ✅ API routes with auth: 100%
- ✅ API routes with `any` types: <5%
- ✅ API routes with proper errors: 100%
- ✅ Components using Button: >95%
- ✅ Files with CSS variables: 100%
- ✅ Interactive elements with ARIA: >90%
- ✅ Duplicate components: 0
- ✅ Test pass rate: 100%

### Development Velocity Improvements
- **State debugging**: Zustand DevTools + TanStack Query DevTools
- **Type safety**: Catch bugs at compile time vs runtime
- **Developer onboarding**: Clear patterns documented
- **Refactoring confidence**: Strong types + tests
- **Feature velocity**: Reusable abstractions

### User Experience Improvements
- **Performance**: Request caching, optimistic updates
- **Reliability**: Proper error handling, retries
- **Accessibility**: Keyboard navigation, screen readers
- **Polish**: Consistent UI, smooth interactions

---

## 🎯 IMPLEMENTATION STRATEGY

### Week-by-Week Plan

**Week 1-2: Critical Fixes (Phase 1)**
- Day 1-3: State management foundation (Zustand stores)
- Day 4-5: Component deduplication
- Day 6-10: Error handling standardization

**Week 3-4: Security & Types (Phase 2)**
- Day 11-13: API authentication middleware
- Day 14-16: Finance type safety + Zod schemas
- Day 17-18: Request validation across all routes
- Day 19-20: Rate limiting implementation

**Week 5-6: UI/UX (Phase 3)**
- Day 21-23: Component standardization (Button/Input)
- Day 24-25: CSS variable migration
- Day 26-27: Accessibility improvements
- Day 28-30: Shared Modal component

**Week 7-8: Architecture (Phase 4)**
- Day 31-34: TanStack Query migration
- Day 35-36: URL state for filters
- Day 37-38: Extract utilities & constants
- Day 39-40: Export pattern standardization

### Parallel Work Streams

Some work can be done in parallel:
- **Stream A** (State & Data): Phases 1.1, 2.2, 4.1, 4.2
- **Stream B** (Security): Phases 2.1, 2.3, 2.4
- **Stream C** (UI): Phases 1.2, 3.1, 3.2, 3.3, 3.4
- **Stream D** (Architecture): Phases 1.3, 4.3, 4.4, 4.5

### Risk Mitigation

**High-Risk Changes**:
- Authentication rollout (Phase 2.1) - Test thoroughly
- TanStack Query migration (Phase 4.1) - Incremental adoption
- Type safety fixes (Phase 2.2) - May reveal runtime bugs

**Mitigation Strategies**:
1. Feature flags for auth (gradual rollout)
2. Parallel fetch + TanStack Query (verify equivalence)
3. Extensive logging during type migrations
4. Canary deployments for each phase

### Communication Plan

- **Daily standups**: Report phase progress
- **Weekly demos**: Show completed features
- **Phase reviews**: Stakeholder sign-off before next phase
- **Documentation**: Update CLAUDE.md after each phase

---

## 📚 DOCUMENTATION UPDATES

After completing normalization, update CLAUDE.md with:

### New Sections to Add

1. **State Management Patterns**
   - When to use Zustand vs TanStack Query vs URL state
   - How to create new stores
   - Persistence strategies

2. **API Development Standards**
   - Authentication middleware usage
   - Request validation with Zod
   - Error handling patterns
   - Response format standards

3. **Component Guidelines**
   - Export patterns (named exports only)
   - Prop type naming conventions
   - When to create in @frok/ui vs apps/web
   - Accessibility checklist

4. **CSS & Styling Standards**
   - CSS variable usage guide
   - Color mapping reference
   - Component variant patterns

5. **Security Best Practices**
   - Auth middleware usage
   - Rate limiting configuration
   - Input validation requirements
   - RLS policy patterns

---

## 🚀 GETTING STARTED

### For Developers

1. **Read this plan** - Understand the why and what
2. **Pick a phase** - Start with Phase 1 (critical)
3. **Create branch** - `feat/normalize-phase-X-Y`
4. **Follow checklist** - Each task has acceptance criteria
5. **Test thoroughly** - No regressions
6. **Document changes** - Update CLAUDE.md
7. **Create PR** - Link to this plan

### For Reviewers

1. **Check acceptance criteria** - All must pass
2. **Verify no regressions** - Tests + manual testing
3. **Validate patterns** - Matches plan standards
4. **Security review** - For Phase 2 changes
5. **Documentation** - CLAUDE.md updated

---

## 📞 SUPPORT & QUESTIONS

**Questions about this plan?**
- Check CLAUDE.md for existing patterns
- Review audit reports in Git history
- Ask in team chat for clarification

**Discovered new issues?**
- Add to "Future Work" section
- Don't block current phase completion
- Prioritize based on impact

---

## ✅ COMPLETION CHECKLIST

**Phase 1 Complete When**:
- [ ] All tests pass
- [ ] No duplicate components
- [ ] No `catch (e: any)` remain
- [ ] Zustand stores documented

**Phase 2 Complete When**:
- [ ] All routes authenticated
- [ ] No `any` in finance routes
- [ ] All routes validate input
- [ ] Rate limits enforced

**Phase 3 Complete When**:
- [ ] >95% buttons use component
- [ ] No hardcoded colors
- [ ] Axe accessibility passes
- [ ] Shared Modal created

**Phase 4 Complete When**:
- [ ] TanStack Query adopted
- [ ] Filters in URL state
- [ ] No duplicate utilities
- [ ] All exports named

**Overall Normalization Complete When**:
- [ ] All phase checklists ✅
- [ ] Metrics meet targets
- [ ] CLAUDE.md updated
- [ ] Team trained on patterns
- [ ] Production deployment successful

---

**Last Updated**: 2025-10-29
**Next Review**: After Phase 2 completion
**Owner**: Development Team
**Status**: 🔴 **IN PROGRESS** (Phase 1)
