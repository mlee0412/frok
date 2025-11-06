# Implementation Plan - Session #13
## Code Review Follow-up & Mobile Enhancement

**Created**: 2025-11-05
**Estimated Duration**: 5 weeks (139 hours + 24 hours new features = 163 hours)
**Status**: Ready to implement

---

## User Requirements Summary

### Priorities (User Confirmed)
1. **Fix all tests first** (29/34 agent tests failing)
2. **Security fixes** - Add auth + rate limiting to HA routes (P0 - Critical)
3. **Mobile-first approach** - Unified responsive design (not separate app)
4. **Focus on details** - Smaller tasks with checkpoints
5. **Proper logging** - Follow CLAUDE.md documentation standards

### New Features Requested
1. **Mobile Header (Global)**:
   - Digital Clock (Date/Day/Time)
   - Simplified weather widget (badges/indicators, minimal text)
   - Shortcuts: Smart home control panel, All lights on/off toggle

2. **Circular Tooltip Selector (Radial Menu)**:
   - Long-tap to open
   - Volume mute (media_player.sonos)
   - Play/pause (media_player.living_room)
   - 6+ configurable shortcut slots

3. **HA Entity Registry Sync**:
   - Sync app's entity registry with Home Assistant server
   - Add more context for entities
   - Keep current hardcoded IDs for user's setup

---

## Week 1: Foundation & Critical Fixes (40 hours)

### Day 1-2: Test Environment Fix (8 hours)
**Checkpoint: All 34 agent tests passing**

**Tasks**:
1. Read current Vitest config (`vitest.config.ts`)
2. Analyze failing tests to understand browser API requirements
3. Install `@vitest/browser` or configure `jsdom` environment
4. Update Vitest config with proper environment:
   ```typescript
   export default defineConfig({
     test: {
       environment: 'jsdom', // or '@vitest/browser'
       setupFiles: ['./test/setup.ts'],
       globals: true,
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         threshold: 60
       }
     }
   })
   ```
5. Run `pnpm test` and verify all tests pass
6. **Checkpoint**: Run `pnpm test` - Must show 34/34 passing

**Files to modify**:
- `vitest.config.ts`
- Possibly `test/setup.ts` for DOM API mocks

---

### Day 2-3: Security Hardening - HA Routes (6 hours)
**Checkpoint: All HA routes secured with auth + rate limiting**

**Tasks**:
1. Read `/api/ha/search/route.ts`
2. Read `/api/ha/call/route.ts`
3. Read `/api/ha/service/route.ts`
4. Read `/api/devices/route.ts`
5. Add security middleware to each route following pattern:
   ```typescript
   export async function POST(req: NextRequest) {
     // Rate limiting
     const rateLimit = await withRateLimit('standard')(req);
     if (!rateLimit.ok) return rateLimit.response;

     // Authentication
     const auth = await withAuth(req);
     if (!auth.ok) return auth.response;

     // Validation
     const validated = await withValidation(HASchema)(req);
     if (!validated.ok) return validated.response;

     // Business logic
     const result = await callHomeAssistant(validated.data, auth.user.id);
     return NextResponse.json(result);
   }
   ```
6. Create Zod schemas for request validation
7. Test each route manually with curl/Postman
8. **Checkpoint**: Verify routes return 401 without auth, 429 when rate limited

**Files to modify**:
- `apps/web/src/app/api/ha/search/route.ts`
- `apps/web/src/app/api/ha/call/route.ts`
- `apps/web/src/app/api/ha/service/route.ts`
- `apps/web/src/app/api/devices/route.ts`
- Possibly create `apps/web/src/lib/validation/ha-schemas.ts`

---

### Day 3-4: Mobile Header Component (12 hours)
**Checkpoint: Mobile header renders with all features on mobile viewport**

#### Step 1: Design & Architecture (2 hours)
**Tasks**:
1. Review existing header component (`apps/web/src/components/Header.tsx`)
2. Design mobile header layout structure:
   ```
   [Clock] [Weather] [Shortcuts Panel Icon] [Lights Toggle]
   ```
3. Determine breakpoint: Display on `<768px` (mobile/tablet)
4. Create component file structure

**Deliverable**: Architecture document or code comments

#### Step 2: Digital Clock Component (3 hours)
**Tasks**:
1. Create `packages/ui/src/components/DigitalClock.tsx`:
   ```typescript
   interface DigitalClockProps {
     format?: '12h' | '24h';
     showDate?: boolean;
     showDay?: boolean;
     className?: string;
   }
   ```
2. Implement real-time clock with `setInterval` (update every second)
3. Format output: `Mon, Nov 5 | 14:23` or `Mon, Nov 5 | 2:23 PM`
4. Use i18n for date/day formatting (EN/KO support)
5. Add to Storybook for visual testing
6. **Checkpoint**: Clock updates every second, shows correct time/date

**Files to create**:
- `packages/ui/src/components/DigitalClock.tsx`
- `packages/ui/src/components/DigitalClock.stories.tsx`

#### Step 3: Simplified Weather Widget (4 hours)
**Tasks**:
1. Create `apps/web/src/components/mobile/WeatherBadge.tsx`
2. Use existing weather API (`/api/weather`) or weather store
3. Design compact layout:
   - Temperature: `72°` (large)
   - Icon: Weather condition (sun, cloud, rain)
   - Badge: "Sunny" or humidity indicator
4. Implement auto-refresh (every 30 minutes)
5. Add loading and error states
6. **Checkpoint**: Widget displays current weather, updates automatically

**Files to create**:
- `apps/web/src/components/mobile/WeatherBadge.tsx`

#### Step 4: Smart Home Shortcuts (3 hours)
**Tasks**:
1. Add control panel shortcut icon (opens HA dashboard modal)
2. Implement "All Lights On/Off" toggle:
   ```typescript
   const toggleAllLights = async () => {
     const lights = await getLightEntities();
     const action = lights.every(l => l.state === 'on') ? 'turn_off' : 'turn_on';
     await Promise.all(lights.map(l => callService('light', action, { entity_id: l.entity_id })));
   };
   ```
3. Add loading states and haptic feedback
4. Show toast notification on success/error
5. **Checkpoint**: Shortcuts function correctly, provide feedback

**Files to modify**:
- Create `apps/web/src/components/mobile/MobileHeader.tsx`
- Modify `apps/web/src/components/Header.tsx` to conditionally render mobile header

---

### Day 5: Circular Tooltip Selector - Part 1 (8 hours)
**Checkpoint: Radial menu opens on long-press with basic UI**

#### Step 1: Architecture & Design (2 hours)
**Tasks**:
1. Research radial menu patterns (iOS/Android inspiration)
2. Design circular layout:
   ```
   6-8 slots arranged in circle
   Center: Icon or avatar
   Slots: 60-degree segments each
   ```
3. Determine gesture: Long-press (800ms) anywhere on screen (or specific trigger)
4. Create component architecture:
   ```typescript
   interface RadialMenuItem {
     id: string;
     icon: string;
     label: string;
     action: () => void | Promise<void>;
   }

   interface CircularSelectorProps {
     items: RadialMenuItem[];
     maxSlots?: number; // default 6
     onOpen?: () => void;
     onClose?: () => void;
   }
   ```

**Deliverable**: Architecture doc + type definitions

#### Step 2: Gesture Detection (3 hours)
**Tasks**:
1. Create custom hook `useGestureDetection.ts`:
   ```typescript
   const useGestureDetection = (options: {
     longPressDuration?: number; // default 800ms
     onLongPress?: (event: TouchEvent) => void;
   }) => {
     // Implement touch event handlers
   }
   ```
2. Implement touch event listeners:
   - `touchstart`: Start timer
   - `touchmove`: Cancel if moved >10px
   - `touchend`: Cancel timer
   - Timer expires: Trigger long-press
3. Add visual feedback (ripple effect during press)
4. Test on mobile devices or browser DevTools mobile emulation
5. **Checkpoint**: Long-press detected reliably after 800ms

**Files to create**:
- `apps/web/src/hooks/useGestureDetection.ts`

#### Step 3: Radial Menu UI (3 hours)
**Tasks**:
1. Create `packages/ui/src/components/CircularSelector.tsx`
2. Implement circular layout with CSS/SVG:
   - Use `position: fixed` for overlay
   - Center on touch point
   - Calculate slot positions with trigonometry:
     ```typescript
     const angle = (360 / slotCount) * index;
     const x = centerX + radius * Math.cos(angle * Math.PI / 180);
     const y = centerY + radius * Math.sin(angle * Math.PI / 180);
     ```
3. Add animations:
   - Fade in + scale up on open
   - Haptic feedback on open (if supported)
   - Slot highlight on hover/touch
4. Implement backdrop (dim background, close on tap outside)
5. **Checkpoint**: Radial menu renders with 6 empty slots, closes properly

**Files to create**:
- `packages/ui/src/components/CircularSelector.tsx`
- `packages/ui/src/components/CircularSelector.stories.tsx`

---

## Week 2: Radial Menu Features & UI Fixes (40 hours)

### Day 1: Radial Menu - Part 2 (8 hours)
**Checkpoint: Radial menu has 2 working actions**

#### Step 1: Media Player Actions (4 hours)
**Tasks**:
1. Implement volume mute action:
   ```typescript
   const muteAction: RadialMenuItem = {
     id: 'volume-mute',
     icon: 'volume-x',
     label: 'Mute',
     action: async () => {
       await callHAService('media_player', 'volume_mute', {
         entity_id: 'media_player.sonos',
         is_volume_muted: true
       });
     }
   }
   ```
2. Implement play/pause action:
   ```typescript
   const playPauseAction: RadialMenuItem = {
     id: 'play-pause',
     icon: 'play',
     label: 'Play/Pause',
     action: async () => {
       await callHAService('media_player', 'media_play_pause', {
         entity_id: 'media_player.living_room'
       });
     }
   }
   ```
3. Add loading states (spinner on slot while action executes)
4. Add success/error feedback (toast + haptic)
5. **Checkpoint**: Both actions work reliably

#### Step 2: Configurability (4 hours)
**Tasks**:
1. Create `useRadialMenuStore` with Zustand:
   ```typescript
   interface RadialMenuState {
     items: RadialMenuItem[];
     addItem: (item: RadialMenuItem) => void;
     removeItem: (id: string) => void;
     reorderItems: (ids: string[]) => void;
   }
   ```
2. Implement persistence to localStorage
3. Create default items (volume mute, play/pause, + 4 empty slots)
4. Add "Add Shortcut" slot that opens configuration modal
5. **Checkpoint**: User can add/remove/reorder shortcuts

**Files to create**:
- `apps/web/src/store/radialMenuStore.ts`

---

### Day 2-3: UI Design Consistency (8 hours)
**Checkpoint: All components use CSS variables, no hardcoded colors**

#### Step 1: Modal Component Fix (3 hours)
**Tasks**:
1. Read `packages/ui/src/components/Modal.tsx`
2. Replace hardcoded colors:
   ```typescript
   // Before: 'bg-gray-900 border border-gray-700'
   // After: 'bg-background border border-border'
   ```
3. Ensure all variants use CSS variables
4. Test modal in light/dark mode
5. Update Storybook stories
6. **Checkpoint**: Modal colors dynamically respond to theme

**Files to modify**:
- `packages/ui/src/components/Modal.tsx`

#### Step 2: Button Variant Fix (3 hours)
**Tasks**:
1. Read `packages/ui/src/components/Button.tsx`
2. Fix primary variant (should be filled, not outline):
   ```typescript
   primary: 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
   ```
3. Verify all 3 variants: primary (filled), outline, ghost
4. Update Storybook to show all variants
5. **Checkpoint**: Primary button has filled background

**Files to modify**:
- `packages/ui/src/components/Button.tsx`

#### Step 3: Design System Audit (2 hours)
**Tasks**:
1. Search codebase for hardcoded colors (`gray-`, `blue-`, `red-`, etc.)
2. Replace with CSS variables
3. Document CSS variable usage in `packages/ui/CLAUDE.md`
4. Run `pnpm typecheck` and `pnpm test`
5. **Checkpoint**: No hardcoded colors in codebase

---

### Day 3-5: HA Entity Registry Sync (16 hours)
**Checkpoint: App syncs entities from HA server to local database**

#### Step 1: HA Registry API Integration (6 hours)
**Tasks**:
1. Research HA WebSocket API for entity registry:
   ```json
   {
     "type": "config/entity_registry/list"
   }
   ```
2. Create API route `/api/ha/sync-entities`:
   ```typescript
   export async function POST(req: NextRequest) {
     const auth = await withAuth(req);
     const entities = await fetchHAEntityRegistry();
     await syncEntitiesToDatabase(entities, auth.user.id);
     return NextResponse.json({ ok: true, count: entities.length });
   }
   ```
3. Implement `fetchHAEntityRegistry()` in `apps/web/src/lib/homeAssistant/registry.ts`
4. Test fetching entities from HA server
5. **Checkpoint**: API successfully fetches all entities from HA

**Files to create**:
- `apps/web/src/app/api/ha/sync-entities/route.ts`
- `apps/web/src/lib/homeAssistant/registry.ts`

#### Step 2: Database Sync (6 hours)
**Tasks**:
1. Review existing HA database tables (`packages/db/schema/homeAssistant.sql`)
2. Implement `syncEntitiesToDatabase()`:
   ```typescript
   const syncEntitiesToDatabase = async (entities: HAEntity[], userId: string) => {
     // Upsert entities to ha_entities table
     // Update device_registry if needed
     // Create entity_state_snapshots for current states
   }
   ```
3. Add entity metadata (friendly names, icons, areas, categories)
4. Handle entity updates (when HA config changes)
5. **Checkpoint**: Database contains all entities with correct metadata

#### Step 3: UI Integration (4 hours)
**Tasks**:
1. Create "Sync Entities" button in HA settings page
2. Show sync status (loading, success, error)
3. Display entity count and last sync time
4. Add auto-sync option (on app startup or every 24 hours)
5. **Checkpoint**: User can manually sync entities, see results

**Files to create/modify**:
- `apps/web/src/components/homeAssistant/EntitySyncButton.tsx`
- Modify `apps/web/src/app/settings/page.tsx`

---

### Day 5: Testing Checkpoint (8 hours)
**Checkpoint: All tests pass, typecheck succeeds, build completes**

**Tasks**:
1. Run `pnpm typecheck` - Fix all TypeScript errors
2. Run `pnpm test` - Ensure 34/34 tests pass (or more with new tests)
3. Run `pnpm test:e2e` - Verify E2E tests pass
4. Run `pnpm build` - Ensure production build succeeds
5. Test new features manually on mobile device:
   - Mobile header displays correctly
   - Radial menu opens on long-press
   - HA entity sync works
6. **Checkpoint**: All automated tests pass, manual testing confirms features work

---

## Week 3: Mobile UI Overhaul (32 hours)

### Mobile Navigation (16 hours)
1. **Bottom Tab Bar** (6 hours):
   - Create 4 tabs: Home, Chat, Devices, Settings
   - Use `fixed bottom-0` positioning
   - Add active state indicators
   - Implement tab switching with URL state

2. **ChatSidebar to Bottom Sheet** (6 hours):
   - Convert sidebar to slide-up bottom sheet on mobile
   - Add swipe-to-close gesture
   - Keep desktop sidebar unchanged
   - Use `@use-gesture/react` for gestures

3. **Full-Screen Modals** (4 hours):
   - Make all modals full-screen on `<768px`
   - Add slide-up animation
   - Keep desktop modals as overlays

### Design System Updates (16 hours)
1. **Mobile Breakpoints** (2 hours):
   - Add Tailwind breakpoints: `xs` (320px), `sm` (640px), `md` (768px)
   - Document breakpoint usage

2. **Fluid Typography** (4 hours):
   - Implement `clamp()` for all text sizes:
     ```css
     font-size: clamp(0.875rem, 0.8rem + 0.4vw, 1rem);
     ```
   - Test on various screen sizes

3. **Responsive GridLayout** (4 hours):
   - Change columns to auto-responsive:
     ```typescript
     gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))'
     ```

4. **Touch Targets** (2 hours):
   - Update Button sizes: `h-10` → `h-12`, add `h-14` option
   - Ensure all interactive elements ≥48px

5. **Mobile HA Interactions** (4 hours):
   - Add swipe gestures to LightCard (brightness control)
   - Implement pull-to-refresh on dashboard
   - Add haptic feedback for all button presses

---

## Week 4: Advanced HA Features (42 hours)

### WebSocket Real-Time Updates (10 hours)
1. Implement WebSocket connection to HA server
2. Subscribe to state change events
3. Update UI in real-time when entities change
4. Add connection status indicator

### Multi-Select Bulk Actions (6 hours)
1. Add checkbox selection mode to device lists
2. Implement bulk actions: Turn on/off, Delete, Group
3. Add "Select All" / "Deselect All" buttons

### Historical Analytics (12 hours)
1. Create analytics dashboard page
2. Fetch historical state data from HA
3. Implement charts with Chart.js or Recharts:
   - Temperature over time
   - Energy usage
   - Light on/off patterns
4. Add date range picker

### Device Discovery UI (8 hours)
1. Create "Discover Devices" page
2. Auto-detect new HA entities
3. Allow user to assign icons, friendly names, rooms
4. Implement drag-and-drop for organization

### Remaining HA Tasks (6 hours)
- Polish existing HA components
- Add error boundaries
- Improve loading states

---

## Week 5: Agent System & Advanced Mobile (32 hours)

### Agent System Improvements (16 hours)
1. **Route Consolidation** (4 hours):
   - Merge `smart-stream` and `smart-stream-enhanced`
   - Remove duplicate code
   - Enable structured outputs by default

2. **Tool Approval UI** (6 hours):
   - Create confirmation modal for tool use
   - Show tool name, parameters, description
   - Add "Always allow" option for trusted tools

3. **Multi-Step Automation** (10 hours):
   - Implement automation builder UI
   - Allow chaining multiple agent actions
   - Save automations to database

4. **Analytics Dashboard** (8 hours):
   - Track agent usage (requests per day, token usage)
   - Show most-used tools
   - Display response times

5. **Keyboard Shortcuts** (4 hours):
   - Add shortcuts: `Cmd+K` (chat), `Cmd+/` (help)
   - Create shortcut overlay

### Advanced Mobile Features (16 hours)
1. **Swipe Navigation** (6 hours):
   - Implement swipe between tabs
   - Use `@use-gesture/react`

2. **Offline Mode** (12 hours):
   - Set up service worker
   - Cache static assets
   - Queue actions when offline
   - Sync when back online

3. **Camera Integration** (4 hours):
   - Add camera button to chat
   - Capture image for AI analysis
   - Use `navigator.mediaDevices.getUserMedia()`

4. **Voice Input Optimization** (6 hours):
   - Improve voice button UX on mobile
   - Add push-to-talk mode
   - Show real-time transcription

5. **PWA Shortcuts** (4 hours):
   - Add home screen shortcuts in manifest:
     ```json
     {
       "shortcuts": [
         { "name": "Chat", "url": "/chat" },
         { "name": "Devices", "url": "/devices" }
       ]
     }
     ```

---

## Checkpoints & Testing Protocol

### After Every Major Feature:
1. **TypeCheck**: `pnpm typecheck` must pass (0 errors)
2. **Unit Tests**: `pnpm test` must pass (maintain 60%+ coverage)
3. **E2E Tests**: `pnpm test:e2e` for critical flows
4. **Manual Testing**:
   - Test on mobile device (Chrome DevTools mobile emulation)
   - Test light/dark mode
   - Test EN/KO i18n
5. **Build**: `pnpm build` must succeed

### End of Each Week:
1. Run full test suite
2. Update `STATUS.md` with progress
3. Update `SESSION_HISTORY.md` with detailed changes
4. Commit all changes with descriptive message
5. Create git tag: `v0.x.0-sessY` (e.g., `v0.4.0-sess13`)

---

## Documentation Requirements

### Update After Each Checkpoint:
1. **STATUS.md**: Current progress, blockers
2. **SESSION_HISTORY.md**: Detailed session log (what changed, why, learnings)
3. **CLAUDE.md** (if patterns change): New coding patterns, common pitfalls
4. **Component READMEs**: Update if new components added

### Commit Message Template:
```
<type>: <concise description>

<detailed explanation>
- What changed
- Why it changed
- Any breaking changes
- Related issues/tasks

Week X, Day Y checkpoint: <checkpoint name>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Technical Specifications

### Mobile Header Component
```typescript
interface MobileHeaderProps {
  className?: string;
}

interface DigitalClockProps {
  format?: '12h' | '24h';
  showDate?: boolean;
  showDay?: boolean;
  locale?: 'en' | 'ko';
}

interface WeatherBadgeProps {
  compact?: boolean;
  showIcon?: boolean;
  refreshInterval?: number; // minutes
}
```

### Circular Selector Component
```typescript
interface RadialMenuItem {
  id: string;
  icon: string; // lucide-react icon name
  label: string;
  action: () => void | Promise<void>;
  color?: string; // CSS variable
  disabled?: boolean;
}

interface CircularSelectorProps {
  items: RadialMenuItem[];
  maxSlots?: number; // 6-8
  radius?: number; // px from center
  centerIcon?: string;
  onOpen?: () => void;
  onClose?: () => void;
  hapticFeedback?: boolean;
}

// Store
interface RadialMenuState {
  items: RadialMenuItem[];
  isOpen: boolean;
  position: { x: number; y: number };
  addItem: (item: RadialMenuItem) => void;
  removeItem: (id: string) => void;
  reorderItems: (ids: string[]) => void;
  open: (position: { x: number; y: number }) => void;
  close: () => void;
}
```

### Entity Registry Sync
```typescript
interface HAEntity {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  platform: string;
  name: string;
  icon?: string;
  unit_of_measurement?: string;
  device_class?: string;
  state?: string;
  attributes?: Record<string, unknown>;
}

interface EntitySyncResult {
  ok: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: string[];
  lastSyncAt: string;
}
```

---

## Risk Mitigation

### Potential Issues:
1. **HA WebSocket Connection**: May drop on network issues
   - **Mitigation**: Implement auto-reconnect with exponential backoff

2. **Gesture Conflicts**: Long-press may conflict with text selection
   - **Mitigation**: Only enable on specific trigger areas, not entire screen

3. **Performance**: Large entity lists may slow down sync
   - **Mitigation**: Batch database operations, add progress indicator

4. **Browser Compatibility**: Haptic feedback not supported everywhere
   - **Mitigation**: Feature detection, graceful degradation

### Testing Strategy:
- **Unit Tests**: All new hooks, utilities
- **Integration Tests**: API routes, database operations
- **E2E Tests**: Critical user flows (auth, HA control, radial menu)
- **Manual Testing**: Mobile devices (iOS Safari, Android Chrome)

---

## Success Metrics

### Week 1:
- ✅ All 34 agent tests passing
- ✅ 0 TypeScript errors
- ✅ 4 HA routes secured
- ✅ Mobile header functional
- ✅ Radial menu opens on long-press

### Week 2:
- ✅ Radial menu has 2+ working actions
- ✅ No hardcoded colors in components
- ✅ Entity sync working (100+ entities synced)

### Week 3:
- ✅ Mobile navigation complete (bottom tabs)
- ✅ All touch targets ≥48px
- ✅ Responsive design on all screen sizes

### Week 4:
- ✅ WebSocket real-time updates working
- ✅ Analytics dashboard deployed

### Week 5:
- ✅ Agent improvements complete
- ✅ Offline mode functional
- ✅ 95%+ mobile UI score

---

## Next Steps

1. **Immediate**: Start with Week 1, Day 1-2 (Test environment fix)
2. **Before each task**: Read relevant files, understand context
3. **After each task**: Test, commit, update documentation
4. **Weekly review**: Assess progress, adjust plan if needed

**Ready to begin implementation!** 🚀
