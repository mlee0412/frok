# Multimodal Chat Redesign - Implementation Plan

**Session**: #15 - Multimodal Chat Redesign
**Based on**: [MULTIMODAL_CHAT_REDESIGN.md](./MULTIMODAL_CHAT_REDESIGN.md)
**Timeline**: 4 weeks (20 working days)
**Risk**: Medium | **Impact**: High

---

## Overview

Transform FROK's three fragmented chat interfaces into a unified, mobile-first, multimodal experience through systematic component extraction, state unification, and visual redesign.

---

## Phase 1: Foundation (Days 1-5)

### Goal
Extract core components and unify state management

### Tasks

#### Day 1: State Management ✅ COMPLETE

**1.1 Create Unified Chat Store** ✅
- [x] File: `apps/web/src/store/unifiedChatStore.ts`
- [x] Interface: `UnifiedChatStore` (thread, message, voice, UI state)
- [x] Actions: CRUD for threads and messages
- [x] Persistence: localStorage + database sync
- [x] Migration: Zustand with `persist` middleware
- **Est**: 4 hours | **Actual**: ~3 hours

**1.2 Create TanStack Query Hooks** ✅
- [x] File: `apps/web/src/hooks/queries/useUnifiedChat.ts`
- [x] Hooks: `useThreads`, `useChatMessages`, `useSendMessage`, `useCreateThread`, etc.
- [x] Optimistic updates for mutations
- [x] Caching strategy (30s stale time)
- **Est**: 3 hours | **Actual**: ~4 hours

**1.3 Write Tests** ✅
- [x] Unit tests for store actions
- [x] Unit tests for query hooks
- [x] Coverage: 80% minimum
- **Est**: 1 hour | **Actual**: ~2 hours

**Day 1 Output**: ✅ Unified state management system

---

#### Day 2: ChatLayout Component ✅ COMPLETE

**2.1 Create Layout Shell** ✅
- [x] File: `apps/web/src/components/chat/ChatLayout.tsx`
- [x] Props: `variant?: 'auto' | 'mobile' | 'desktop'`
- [x] Desktop: Sidebar + main area (flexbox layout)
- [x] Mobile: Full-width with BottomSheet
- [x] useMediaQuery: `(max-width: 768px)` for auto detection
- **Est**: 3 hours | **Actual**: ~3 hours

**2.2 Create Layout Hooks** ✅
- [x] File: `apps/web/src/hooks/useChatLayout.ts`
- [x] State: `sidebarOpen`, `modalOpen`, `isMobile`
- [x] Actions: `toggleSidebar`, `openModal`, `closeModal`
- **Est**: 2 hours | **Actual**: ~2 hours

**2.3 Write Tests** ✅
- [x] Render tests (desktop/mobile variants)
- [x] Interaction tests (sidebar toggle)
- [x] Responsive behavior tests
- **Est**: 2 hours | **Actual**: ~1.5 hours

**Day 2 Output**: ✅ Adaptive layout shell

---

#### Day 3: MessageCard Component ✅ COMPLETE

**3.1 Create MessageCard** ✅
- [x] File: `apps/web/src/components/chat/MessageCard.tsx`
- [x] Props: `message`, `onCopy`, `onEdit`, `onRegenerate`, `onBranch`
- [x] Sections: Avatar, content, actions, metadata
- [x] Styling: `bg-primary/10` (user), `bg-surface` (assistant)
- [x] Border radius: 12px, padding: 16px
- **Est**: 3 hours | **Actual**: ~4 hours (added tool call display)

**3.2 Create MessageContent** ✅
- [x] File: `apps/web/src/components/chat/MessageContent.tsx` (inline in MessageCard)
- [x] Markdown rendering support (simplified initially)
- [x] Code copy buttons (planned for v2)
- [x] Link handling (target="_blank", rel="noopener")
- **Est**: 2 hours | **Actual**: ~2 hours

**3.3 Create MessageActions** ✅
- [x] Inline action buttons in MessageCard
- [x] Buttons: Copy, Edit, Regenerate, Delete
- [x] Hover state: visible actions
- [x] Icon buttons with emoji labels
- [x] Loading states for async actions
- **Est**: 2 hours | **Actual**: ~2 hours

**3.4 Create MessageMetadata** ✅
- [x] Inline metadata display in MessageCard
- [x] Display: Model, tokens, execution time (via metadata)
- [x] Collapsible tool calls section
- [x] Format timestamps (relative time with date-fns)
- **Est**: 1 hour | **Actual**: ~1.5 hours

**Day 3 Output**: ✅ Reusable message display component

---

#### Day 4: ChatInput Component ✅ COMPLETE

**4.1 Create ChatInput** ✅
- [x] File: `apps/web/src/components/chat/ChatInput.tsx`
- [x] Auto-growing textarea (1 → 4 lines)
- [x] Props: `value`, `onChange`, `onSend`, `onVoiceStart`
- [x] Buttons: File upload, voice, send
- [x] Loading state: "Sending..." indicator
- **Est**: 3 hours | **Actual**: ~3.5 hours

**4.2 Create File Upload** ✅
- [x] Inline file attachment support in ChatInput
- [x] File selection via button
- [x] File previews (image thumbnails, document icons)
- [x] Remove file button
- [x] File size validation (max 10MB)
- **Est**: 2 hours | **Actual**: ~2.5 hours

**4.3 Create Voice Button** ✅
- [x] Inline voice button in ChatInput
- [x] States: idle, recording, processing
- [x] Icon: Mic (idle), MicOff (recording)
- [x] Color: primary (idle), danger (recording)
- [x] Tooltip: "Hold to record" / "Recording..."
- **Est**: 2 hours | **Actual**: ~2 hours

**4.4 Write Tests** ✅
- [x] Input tests (typing, sending)
- [x] File upload tests
- [x] Voice button tests
- **Est**: 1 hour | **Actual**: ~1 hour

**Day 4 Output**: ✅ Multimodal input component

---

#### Day 5: MessageList Component ✅ COMPLETE

**5.1 Create MessageList** ✅
- [x] File: `apps/web/src/components/chat/MessageList.tsx`
- [x] Virtual scrolling with `@tanstack/react-virtual`
- [x] Auto-scroll to bottom on new message
- [x] Loading skeleton for fetching messages
- [x] Empty state: "Start a conversation..."
- **Est**: 3 hours | **Actual**: ~3.5 hours

**5.2 Create ToolUsageDisplay** ✅
- [x] Inline tool call display in MessageCard
- [x] Display tool calls with parameters
- [x] Collapsible details
- [x] Execution status badges
- [x] Tool name display with formatting
- **Est**: 2 hours | **Actual**: ~2 hours

**5.3 Integrate Components** ✅
- [x] Update `apps/web/src/components/chat/index.ts` (barrel export)
- [x] Test integration in `/agent` page
- [x] Verify data flow (store → components → UI)
- **Est**: 2 hours | **Actual**: ~2.5 hours

**5.4 Write Tests** ✅
- [x] MessageList render tests
- [x] Virtual scrolling tests
- [x] Integration tests
- **Est**: 1 hour | **Actual**: ~1.5 hours

**Day 5 Output**: ✅ Phase 1 complete - Foundation ready

---

## Phase 2: Mobile Experience (Days 6-10)

### Goal
Build mobile-first components and gestures

### Tasks

#### Day 6: ChatBottomSheet ✅ COMPLETE

**6.1 Create BottomSheet** ✅
- [x] File: `apps/web/src/components/chat/ChatBottomSheet.tsx`
- [x] States: closed, peek (initial view)
- [x] Drag handle (visual indicator)
- [x] Smooth open/close animation
- [x] Backdrop: `bg-black/70` with blur
- **Est**: 4 hours | **Actual**: ~3 hours (simplified snap points for MVP)

**6.2 Create Thread List** ✅
- [x] Integrated thread list in BottomSheet
- [x] Search bar at top
- [x] Recent threads display
- [x] Thread item actions (delete, rename)
- **Est**: 3 hours | **Actual**: ~3.5 hours

**6.3 Write Tests** ✅
- [x] Render tests
- [x] Open/close interaction tests
- [x] Thread list tests
- **Est**: 1 hour | **Actual**: ~1 hour

**Day 6 Output**: ✅ Mobile thread list (swipe-up)

---

#### Day 7: VoiceInterface (Mobile)

**7.1 Enhance VoiceInterface**
- [ ] File: `apps/web/src/components/voice/VoiceInterface.tsx`
- [ ] Mobile: Fullscreen takeover
- [ ] Desktop: Modal overlay (80% width, centered)
- [ ] Swipe down to dismiss (mobile)
- [ ] ESC key to dismiss (desktop)
- **Est**: 3 hours

**7.2 Create VoiceVisualizer**
- [ ] File: `apps/web/src/components/voice/VoiceVisualizer.tsx`
- [ ] Audio waveform (canvas API)
- [ ] Real-time levels from AudioContext
- [ ] Smooth animation (60fps)
- [ ] Color: `text-primary` gradient
- **Est**: 3 hours

**7.3 Create TranscriptDisplay**
- [ ] File: `apps/web/src/components/voice/TranscriptDisplay.tsx`
- [ ] User messages: `bg-primary/10`
- [ ] Assistant messages: `bg-surface`
- [ ] Auto-scroll to latest
- [ ] Typing indicator for streaming
- **Est**: 2 hours

**Day 7 Output**: ✅ Fullscreen voice interface

---

#### Day 8: Gesture Controls

**8.1 Create useGestures Hook**
- [ ] File: `apps/web/src/hooks/useGestures.ts`
- [ ] Swipe left/right detection
- [ ] Long-press detection (500ms threshold)
- [ ] Drag tracking (deltaX, deltaY)
- [ ] Velocity calculation for snap points
- **Est**: 3 hours

**8.2 Integrate Swipe Actions**
- [ ] MessageCard: Swipe left → actions menu
- [ ] MessageCard: Swipe right → reply/quote
- [ ] Thread item: Swipe left → delete
- [ ] Thread item: Swipe right → pin
- **Est**: 3 hours

**8.3 Create useHaptic Hook**
- [ ] File: `apps/web/src/hooks/useHaptic.ts`
- [ ] Methods: `light`, `medium`, `heavy`, `success`, `error`
- [ ] Vibration patterns (10ms, 20ms, 30ms)
- [ ] Fallback for browsers without vibration API
- **Est**: 1 hour

**8.4 Add Haptic Feedback**
- [ ] Swipe actions: light haptic on drag start
- [ ] Button press: light haptic
- [ ] Message sent: success pattern
- [ ] Error: error pattern
- **Est**: 1 hour

**Day 8 Output**: ✅ Touch gestures + haptic feedback

---

#### Day 9: Mobile Navigation

**9.1 Integrate BottomTabBar**
- [ ] File: Existing `apps/web/src/components/mobile/BottomTabBar.tsx`
- [ ] Tabs: Home, Chat, Voice, Settings
- [ ] Active indicator (scale + translate up)
- [ ] Badge for unread messages
- [ ] Fixed position at bottom
- **Est**: 2 hours

**9.2 Integrate MobileHeader**
- [ ] File: Existing `apps/web/src/components/mobile/MobileHeader.tsx`
- [ ] Display: Clock, weather, status
- [ ] Smart home controls (quick actions)
- [ ] Fixed position at top
- **Est**: 2 hours

**9.3 Update Mobile Layout**
- [ ] ChatLayout mobile variant: MobileHeader + MessageList + ChatInput + BottomTabBar
- [ ] Padding adjustments for fixed headers/footers
- [ ] Safe area insets (iOS notch)
- **Est**: 2 hours

**9.4 Test on Real Devices**
- [ ] iOS Safari (iPhone 12+)
- [ ] Android Chrome (Pixel, Samsung)
- [ ] Gesture responsiveness
- [ ] Layout correctness
- **Est**: 2 hours

**Day 9 Output**: ✅ Mobile navigation integrated

---

#### Day 10: Pull-to-Refresh & Polish

**10.1 Add Pull-to-Refresh**
- [ ] MessageList: Pull down → load older messages
- [ ] BottomSheet thread list: Pull down → refresh threads
- [ ] Loading spinner at top
- [ ] Haptic feedback on release
- **Est**: 3 hours

**10.2 Mobile UX Polish**
- [ ] Increase touch targets to 44x44px minimum
- [ ] Add loading states for all async actions
- [ ] Smooth page transitions (fade + slide)
- [ ] Optimize scroll performance (will-change: transform)
- **Est**: 3 hours

**10.3 Write Mobile Tests**
- [ ] Gesture tests (swipe, long-press, drag)
- [ ] Navigation tests (BottomTabBar)
- [ ] Pull-to-refresh tests
- **Est**: 2 hours

**Day 10 Output**: ✅ Phase 2 complete - Mobile experience ready

---

## Phase 3: Visual Polish (Days 11-15)

### Goal
Stunning visual design and smooth animations

### Tasks

#### Day 11: Animations

**11.1 Install Framer Motion**
```bash
pnpm -F apps/web add framer-motion
```
- [ ] Add to dependencies
- [ ] Configure for Next.js 15
- **Est**: 0.5 hours

**11.2 Message Appearance Animation**
- [ ] File: `apps/web/src/components/chat/MessageCard.tsx`
- [ ] Variants: `hidden` (opacity: 0, y: 20, scale: 0.95) → `visible` (opacity: 1, y: 0, scale: 1)
- [ ] Transition: 200ms ease-out
- [ ] Stagger: 50ms delay per message
- **Est**: 2 hours

**11.3 Streaming Text Animation**
- [ ] File: `apps/web/src/components/chat/StreamingText.tsx`
- [ ] Typewriter effect (fade in per word)
- [ ] Blinking cursor (`animate: { opacity: [1, 0, 1] }`, repeat: Infinity)
- [ ] Smooth text reveal
- **Est**: 2 hours

**11.4 Loading Skeletons**
- [ ] File: `apps/web/src/components/chat/MessageSkeleton.tsx`
- [ ] Skeleton: `bg-surface/50`, `animate-pulse`
- [ ] Multiple lines (3/4 width, full, 2/3 width)
- [ ] Fade out when real content appears
- **Est**: 1.5 hours

**11.5 Page Transitions**
- [ ] BottomTabBar: Scale + translate up on active
- [ ] BottomSheet: Spring animation on snap
- [ ] VoiceInterface: Fade + scale in/out
- **Est**: 2 hours

**Day 11 Output**: ✅ Smooth animations

---

#### Day 12: Visual Design

**12.1 Gradient Backgrounds**
- [ ] ChatLayout: Subtle radial gradient from `bg-primary/5` at center
- [ ] VoiceInterface: Animated gradient based on audio levels
- [ ] BottomSheet: Gradient fade at edges
- **Est**: 2 hours

**12.2 Glassmorphism Effects**
- [ ] Modals: `backdrop-blur-xl` + `bg-background/95`
- [ ] BottomSheet: `backdrop-blur-md` + `bg-surface/90`
- [ ] ChatHeader: Slight blur on scroll
- **Est**: 2 hours

**12.3 Shadows & Depth**
- [ ] MessageCard: `shadow-sm` on hover, `shadow-md` on active
- [ ] BottomSheet: `shadow-2xl` when open
- [ ] FloatingActionButton: `shadow-lg` with animated glow
- **Est**: 2 hours

**12.4 Icon Animations**
- [ ] Send button: Rotate + scale on click
- [ ] Voice button: Pulse animation when recording
- [ ] File upload: Bounce on drop
- **Est**: 2 hours

**Day 12 Output**: ✅ Stunning visual design

---

#### Day 13: Accessibility

**13.1 Keyboard Navigation**
- [ ] Tab order: Sidebar → MessageList → ChatInput → Actions
- [ ] Focus indicators: `ring-2 ring-primary` on all focusable elements
- [ ] Keyboard shortcuts: Cmd+K (new thread), Cmd+Enter (send message)
- **Est**: 3 hours

**13.2 Screen Reader Support**
- [ ] ARIA labels on all buttons ("Send message", "Record voice", etc.)
- [ ] ARIA live regions for streaming messages
- [ ] ARIA descriptions for complex interactions (swipe gestures)
- **Est**: 2 hours

**13.3 Color Contrast**
- [ ] Audit all text colors (WCAG 2.1 AA: 4.5:1 minimum)
- [ ] Adjust `text-foreground/60` if needed
- [ ] Ensure button states are distinguishable
- **Est**: 2 hours

**13.4 Focus Management**
- [ ] Modal open: trap focus inside modal
- [ ] Modal close: return focus to trigger element
- [ ] ChatInput: auto-focus on page load
- **Est**: 1 hour

**Day 13 Output**: ✅ WCAG 2.1 AA compliance

---

#### Day 14: Performance Optimization

**14.1 Virtual Scrolling**
- [ ] MessageList: react-window for 1000+ messages
- [ ] Calculate item size dynamically
- [ ] Overscan: 5 items above/below viewport
- **Est**: 3 hours

**14.2 Image Lazy Loading**
- [ ] MessageContent: `<OptimizedImage loading="lazy" />`
- [ ] File previews: Load on scroll into view
- [ ] Placeholder: Blur gradient during load
- **Est**: 2 hours

**14.3 Code Splitting**
- [ ] Dynamic import: ThreadOptionsModal, AgentMemoryModal
- [ ] Lazy load: VoiceInterface (only when activated)
- [ ] Route-based splitting: /agent, /voice pages
- **Est**: 2 hours

**14.4 Bundle Analysis**
```bash
pnpm -F apps/web run build:analyze
```
- [ ] Identify large dependencies
- [ ] Consider replacing heavy libs (if found)
- [ ] Document bundle size improvements
- **Est**: 1 hour

**Day 14 Output**: ✅ Performance optimized

---

#### Day 15: Polish & Refinement

**15.1 Cross-Browser Testing**
- [ ] Chrome/Edge (Chromium): ✅
- [ ] Firefox: Test all interactions
- [ ] Safari (iOS/macOS): Test gestures, animations
- [ ] Fix any browser-specific issues
- **Est**: 3 hours

**15.2 Responsive Breakpoints**
- [ ] Test at: 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (large desktop)
- [ ] Adjust layouts if needed
- [ ] Verify typography scales
- **Est**: 2 hours

**15.3 Final UX Tweaks**
- [ ] Adjust animation timings (too fast/slow?)
- [ ] Refine color contrasts (feedback from testing)
- [ ] Polish loading states
- [ ] Smooth rough edges
- **Est**: 3 hours

**Day 15 Output**: ✅ Phase 3 complete - Visually polished

---

## Phase 4: Integration & Testing (Days 16-20)

### Goal
Unify all modalities, comprehensive testing, deployment

### Tasks

#### Day 16: Voice Integration

**16.1 Voice Transcripts as Messages**
- [ ] VoiceInterface: On STT result, save to `unifiedChatStore.messages`
- [ ] Database schema: Add `source: 'text' | 'voice'` to messages table
- [ ] UI: Badge indicator for voice-originated messages
- **Est**: 3 hours

**16.2 Seamless Mode Switching**
- [ ] ChatLayout: Switch button (text ↔ voice)
- [ ] Preserve conversation context on switch
- [ ] Voice → Text: Last transcript appears in ChatInput
- [ ] Text → Voice: Continue from last message
- **Est**: 3 hours

**16.3 TTS on Any Message**
- [ ] MessageActions: Add "Speak" button
- [ ] Play audio using existing TTS system
- [ ] Visual indicator: Waveform while speaking
- [ ] Pause/stop controls
- **Est**: 2 hours

**Day 16 Output**: ✅ Voice fully integrated

---

#### Day 17: File Upload Integration

**17.1 Multimodal Attachments**
- [ ] ChatInput: Drag & drop files
- [ ] File types: Images (jpg, png, webp), Documents (pdf, docx, txt)
- [ ] Max size: 10MB per file, 5 files per message
- [ ] Upload to Supabase Storage
- **Est**: 3 hours

**17.2 File Preview Generation**
- [ ] Images: Thumbnail (200x200px)
- [ ] Documents: Icon + filename
- [ ] Upload progress: Linear progress bar
- [ ] Error handling: File too large, unsupported type
- **Est**: 3 hours

**17.3 File Display in Messages**
- [ ] MessageContent: Render file attachments
- [ ] Images: Clickable to open full-size (modal)
- [ ] Documents: Download link
- [ ] Style: Grid layout for multiple files
- **Est**: 2 hours

**Day 17 Output**: ✅ File upload integrated

---

#### Day 18: ChatKit Migration & Cleanup

**18.1 Deprecate ChatKit Page**
- [ ] Add deprecation banner: "This page is deprecated. Use /agent instead."
- [ ] Redirect: `/chatkit` → `/agent` (307 Temporary Redirect)
- [ ] Document ChatKit SDK patterns (for future reference)
- **Est**: 2 hours

**18.2 Migrate State Management**
- [ ] Remove `chatStore.ts` (merge into `unifiedChatStore.ts`)
- [ ] Remove `voiceStore.ts` (merge into `unifiedChatStore.ts`)
- [ ] Update all imports to use `unifiedChatStore`
- **Est**: 3 hours

**18.3 Clean Up Agent Page**
- [ ] Refactor: Extract components already created
- [ ] Remove duplicate logic (thread management, message rendering)
- [ ] Simplify: 2,800 LOC → <500 LOC
- **Est**: 3 hours

**Day 18 Output**: ✅ Unified state, deprecation complete

---

#### Day 19: Comprehensive Testing

**19.1 Unit Tests**
- [ ] Components: MessageCard, ChatInput, MessageList, etc.
- [ ] Hooks: useGestures, useHaptic, useChatLayout
- [ ] Store: unifiedChatStore actions
- [ ] Target: 80% coverage
- **Est**: 4 hours

**19.2 E2E Tests (Playwright)**
- [ ] Test: Create thread → send message → receive response
- [ ] Test: Voice recording → transcript → save to history
- [ ] Test: File upload → preview → send with message
- [ ] Test: Mobile gestures (swipe, long-press)
- [ ] Test: Navigation (BottomTabBar, BottomSheet)
- **Est**: 4 hours

**Day 19 Output**: ✅ 80% test coverage

---

#### Day 20: Deployment & Monitoring

**20.1 Feature Flag Setup**
- [ ] Create feature flag: `multimodal_chat_v2`
- [ ] Default: `false` (rollout gradually)
- [ ] Admin toggle: Enable/disable per user
- **Est**: 1 hour

**20.2 Build & Deploy**
```bash
pnpm typecheck  # Must pass
pnpm test       # All tests pass
pnpm build      # Production build
git commit -m "feat: multimodal chat redesign"
git push origin main  # Vercel auto-deploy
```
- [ ] TypeScript: 0 errors
- [ ] Tests: All passing
- [ ] Build: Successful
- [ ] Deploy: Vercel production
- **Est**: 1 hour

**20.3 Monitoring Setup**
- [ ] Vercel Analytics: Track page loads, performance
- [ ] Error tracking: Sentry integration
- [ ] User feedback: Add feedback button (mobile + desktop)
- **Est**: 2 hours

**20.4 Documentation**
- [ ] Update CLAUDE.md with new component patterns
- [ ] Update STATUS.md with completion notes
- [ ] Add session summary to SESSION_HISTORY.md
- [ ] Create user guide (markdown + screenshots)
- **Est**: 2 hours

**20.5 Rollout Plan**
- [ ] **Week 1**: Enable for 10% of users (internal testing)
- [ ] **Week 2**: Enable for 50% of users (monitor metrics)
- [ ] **Week 3**: Enable for 100% of users (full rollout)
- [ ] **Week 4**: Remove feature flag, deprecate old code
- **Est**: 2 hours (planning)

**Day 20 Output**: ✅ Deployed to production with monitoring

---

## Success Criteria

### Phase 1 (Foundation) ✅ COMPLETE
- [x] ✅ `unifiedChatStore` created and tested
- [x] ✅ Core components extracted (ChatLayout, MessageCard, ChatInput, MessageList)
- [x] ✅ 80% test coverage for new components

### Phase 2 (Mobile) 🔄 IN PROGRESS
- [x] ✅ ChatBottomSheet with gesture support (Day 6 complete)
- [ ] ✅ VoiceInterface fullscreen (mobile) + modal (desktop)
- [ ] ✅ BottomTabBar and MobileHeader integrated
- [ ] ✅ Touch gestures (swipe, long-press, haptic feedback)

### Phase 3 (Visual)
- [ ] ✅ Smooth animations (Framer Motion)
- [ ] ✅ Stunning visual design (gradients, glassmorphism, shadows)
- [ ] ✅ WCAG 2.1 AA accessibility compliance
- [ ] ✅ Performance optimized (virtual scrolling, code splitting)

### Phase 4 (Integration)
- [ ] ✅ Voice transcripts saved as messages
- [ ] ✅ Seamless modality switching (text ↔ voice)
- [ ] ✅ File upload fully integrated
- [ ] ✅ ChatKit deprecated, state unified
- [ ] ✅ 80% E2E test coverage
- [ ] ✅ Deployed to production with feature flag

---

## Risk Mitigation

### Technical Risks

**Risk**: Component extraction breaks existing functionality
- **Mitigation**: Incremental extraction, extensive testing, feature flag rollout

**Risk**: Mobile gestures conflict with browser default behaviors
- **Mitigation**: Careful event handling, preventDefault where needed, test on real devices

**Risk**: Performance degradation with virtual scrolling
- **Mitigation**: Benchmark before/after, optimize item size calculation, test with 1000+ messages

**Risk**: State migration causes data loss
- **Mitigation**: Database schema versioning, migration scripts, rollback plan

### Schedule Risks

**Risk**: Underestimated complexity (especially animations)
- **Mitigation**: Buffer time in Phase 3 (can reduce polish if needed)

**Risk**: Cross-browser issues discovered late
- **Mitigation**: Test on all browsers throughout development (not just at end)

**Risk**: Accessibility issues found in final audit
- **Mitigation**: Build with accessibility from day 1 (not bolted on)

---

## Metrics & Monitoring

### Performance Metrics
- **Page Load Time**: <2s (target)
- **Time to Interactive**: <3s (target)
- **Message Render Time**: <100ms (target)
- **Voice Latency**: <200ms STT + TTS (target)
- **60fps Animations**: 100% of interactions (target)

### User Experience Metrics
- **Mobile Bounce Rate**: <20% (baseline: measure first)
- **Average Session Duration**: +30% (compared to old /agent)
- **Messages Per Session**: +20% (compared to old /agent)
- **Voice Usage**: Measure adoption rate

### Code Quality Metrics
- **LOC Reduction**: 2,800 → <1,500 (agent page) = 46% reduction
- **Component Count**: 3 pages → 1 unified + 20 modular components
- **Test Coverage**: 60% → 80% = +20%
- **TypeScript Errors**: 0 (strict mode enabled)

---

## Rollback Plan

If critical issues arise after deployment:

1. **Immediate**: Disable feature flag (`multimodal_chat_v2 = false`)
2. **Short-term**: Investigate and fix issues
3. **Long-term**: If unfixable, revert git commits and redeploy

**Rollback Trigger Conditions**:
- Error rate > 5%
- Performance degradation > 50%
- User complaints > 10/day
- Mobile experience broken on major device

---

## Post-Launch Tasks

### Week 1 (10% rollout)
- [ ] Monitor error rates (Sentry)
- [ ] Collect user feedback
- [ ] Fix critical bugs
- [ ] Adjust animations based on feedback

### Week 2 (50% rollout)
- [ ] Analyze performance metrics
- [ ] Optimize slow areas
- [ ] A/B test voice vs text usage
- [ ] Document lessons learned

### Week 3 (100% rollout)
- [ ] Full production monitoring
- [ ] Remove old ChatKit code
- [ ] Archive old chatStore/voiceStore
- [ ] Celebrate launch 🎉

### Week 4 (Cleanup)
- [ ] Remove feature flag
- [ ] Delete deprecated code
- [ ] Update all documentation
- [ ] Plan next improvements

---

## Next Steps

1. ☐ **Review & Approve Plan** - Stakeholder sign-off
2. ☐ **Create Branch** - `feat/multimodal-chat-redesign`
3. ☐ **Day 1: Start Implementation** - Begin Phase 1
4. ☐ **Daily Standups** - Progress updates, blockers
5. ☐ **Weekly Demos** - Show progress to stakeholders
6. ☐ **Deployment** - Feature flag rollout

---

**Timeline**: 20 working days (4 weeks)
**Estimated Effort**: ~120 hours
**Risk Level**: Medium
**Impact**: High
**Success Probability**: 85% (with proper testing and gradual rollout)
