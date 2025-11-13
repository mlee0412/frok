# Day 15: Cross-browser Testing and Final Polish - Testing Plan

**Date**: 2025-11-13
**Status**: In Progress
**Dev Server**: http://localhost:3004

## Testing Checklist

### 🌐 Browser Compatibility Testing

#### Chrome/Edge (Chromium) Testing
**Priority**: Critical (Primary user base)

**Core Functionality**:
- [ ] Chat message sending and receiving
- [ ] Virtual scrolling performance (1000+ messages)
- [ ] Image lazy loading (verify images load as scrolled into view)
- [ ] File upload (drag & drop, click to upload)
- [ ] Voice interface toggle and activation
- [ ] Thread management (create, switch, delete)
- [ ] Mobile navigation (bottom sheet, sidebar)
- [ ] Agent memory integration
- [ ] TTS settings and voice playback

**Performance Metrics**:
- [ ] Initial page load < 3s
- [ ] Time to Interactive (TTI) < 2s
- [ ] Smooth 60fps scrolling with 1000+ messages
- [ ] No layout shifts (CLS < 0.1)
- [ ] Memory usage < 100MB after 30min usage

**Visual/UX**:
- [ ] Design tokens rendering correctly (all colors using CSS variables)
- [ ] Glassmorphism effects (backdrop-blur, surface opacity)
- [ ] Framer Motion animations smooth (no jank)
- [ ] Hover states and transitions working
- [ ] Focus states visible for accessibility
- [ ] Loading skeletons displaying properly

#### Firefox Testing
**Priority**: High (Secondary browser)

**Known Differences to Check**:
- [ ] Backdrop-filter support (may need fallback)
- [ ] Scroll behavior (Firefox has different momentum)
- [ ] CSS Grid and Flexbox rendering
- [ ] Web APIs (IntersectionObserver, ResizeObserver)
- [ ] File upload API compatibility
- [ ] Audio playback (TTS)

**Specific Tests**:
- [ ] Virtual scrolling smooth in Firefox
- [ ] Glassmorphism effects render or fallback gracefully
- [ ] All Framer Motion animations work
- [ ] File drag & drop functional
- [ ] Voice recording functional (if applicable)
- [ ] localStorage/IndexedDB working (Zustand persistence)

**Expected Issues**:
- Backdrop-filter may not render perfectly (add fallback with solid background)
- Scroll behavior might feel different (Firefox uses different easing)

#### Safari (iOS/macOS) Testing
**Priority**: Medium-High (Mobile users)

**Known Safari Quirks**:
- [ ] -webkit-overflow-scrolling: touch (momentum scrolling)
- [ ] Viewport height issues (100vh vs 100dvh)
- [ ] Touch gesture conflicts
- [ ] Audio autoplay restrictions
- [ ] Date input styling differences

**Specific Tests**:
- [ ] Bottom sheet swipe gestures smooth on iOS
- [ ] No horizontal scroll on mobile
- [ ] Touch targets ≥44px for iOS guidelines
- [ ] Voice interface works with iOS audio restrictions
- [ ] Input focus doesn't cause zoom (font-size ≥16px)
- [ ] Safe area insets respected (notch devices)

**Mobile Safari Specific**:
- [ ] Test on iPhone (iOS 16+) - Physical device or Simulator
- [ ] Test landscape and portrait orientations
- [ ] Test with keyboard open (input visibility)
- [ ] Test PWA behavior (if applicable)

### 📱 Responsive Breakpoint Testing

#### Mobile (375px - Small Phone)
**Device Examples**: iPhone SE, iPhone 12 Mini

**Layout Tests**:
- [ ] Single column layout
- [ ] Bottom navigation accessible
- [ ] Input area doesn't overlap content
- [ ] Text readable without zooming
- [ ] Buttons large enough to tap (≥44px)
- [ ] Horizontal scroll disabled

**Chat Interface**:
- [ ] Messages stack properly
- [ ] File previews responsive
- [ ] Voice button accessible
- [ ] Thread list in bottom sheet
- [ ] No content cutoff

#### Mobile (768px - Tablet Portrait)
**Device Examples**: iPad Mini, smaller tablets

**Layout Tests**:
- [ ] Sidebar can be toggled on/off
- [ ] Main content area optimized
- [ ] 2-column layout for appropriate sections
- [ ] Touch targets still adequate
- [ ] Keyboard shortcuts visible (if applicable)

#### Desktop (1024px - Laptop)
**Device Examples**: 13" laptops, smaller desktops

**Layout Tests**:
- [ ] Sidebar always visible (optional)
- [ ] Main chat area spacious
- [ ] Multi-column layouts working
- [ ] Hover states functional
- [ ] Keyboard shortcuts working

#### Large Desktop (1440px+)
**Device Examples**: 15"+ laptops, external monitors

**Layout Tests**:
- [ ] Content doesn't stretch excessively
- [ ] Max-width constraints applied
- [ ] Whitespace balanced
- [ ] Multi-panel layouts optimized
- [ ] HD images loading properly

### 🎨 Design System Validation

#### Color Token Compliance
**Critical**: All colors MUST use semantic CSS variables

**Validation Steps**:
1. [ ] Search codebase for hardcoded colors:
   ```bash
   grep -r "gray-[0-9]" apps/web/src/components/
   grep -r "#[0-9a-fA-F]{6}" apps/web/src/components/
   grep -r "rgb\(" apps/web/src/components/
   ```

2. [ ] Verify all components use semantic tokens:
   - `bg-background`, `bg-surface`, `bg-primary`, etc.
   - `text-foreground`, `text-foreground/70`, `text-danger`, etc.
   - `border-border`, `border-primary`, `border-danger`, etc.

3. [ ] Test theme switching (if applicable)
4. [ ] Verify dark mode compliance (default is dark)

#### Component Library Usage
- [ ] All buttons use `<Button>` from @frok/ui
- [ ] All modals use `<Modal>` from @frok/ui
- [ ] All inputs use standardized components
- [ ] No custom styled components bypassing design system

### ⚡ Performance Testing

#### Bundle Size Analysis
**Target**: Initial bundle < 350KB gzipped

**Verify**:
- [ ] Run `pnpm build:analyze` (when environment allows)
- [ ] Check main bundle size
- [ ] Verify code splitting working (VoiceSheet, modals)
- [ ] Verify lazy loading reducing initial load

**Expected Results from Day 14 Optimizations**:
- VoiceSheet: ~25KB lazy loaded
- Heavy modals: Code-split
- Images: Lazy loaded natively
- Virtual scrolling: Minimal overhead

#### Runtime Performance
**Metrics to Monitor**:
- [ ] Initial load time < 3s (3G network)
- [ ] Time to Interactive < 2s
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms

**Chrome DevTools Testing**:
1. Open Performance tab
2. Record page load
3. Record 30-second interaction (scrolling, typing, switching threads)
4. Check for long tasks (>50ms)
5. Verify smooth 60fps animations

### 🔧 Functional Testing

#### Chat Core Features
- [ ] Send text messages
- [ ] Send messages with file attachments
- [ ] Receive AI responses
- [ ] Streaming responses render correctly
- [ ] Message editing (if implemented)
- [ ] Message deletion
- [ ] Copy message content
- [ ] Regenerate responses

#### Thread Management
- [ ] Create new thread
- [ ] Switch between threads
- [ ] Rename threads
- [ ] Delete threads
- [ ] Thread list search/filter
- [ ] Thread persistence (reload page)

#### File Handling
- [ ] Click to upload files
- [ ] Drag & drop files
- [ ] Multiple file selection
- [ ] File preview (images)
- [ ] File preview (non-images)
- [ ] Remove files before sending
- [ ] File upload progress
- [ ] File size limits enforced

#### Voice Features
- [ ] Toggle voice interface
- [ ] Voice recording (if implemented)
- [ ] TTS playback
- [ ] TTS settings (voice, speed)
- [ ] Voice sheet animation smooth

#### State Persistence
- [ ] Chat history persists on reload
- [ ] Draft messages persist
- [ ] UI preferences persist (sidebar state)
- [ ] TTS settings persist
- [ ] User memories persist

### ♿ Accessibility Testing

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Tab order logical
- [ ] Focus visible on all focusable elements
- [ ] Escape closes modals/sheets
- [ ] Enter submits forms
- [ ] Arrow keys navigate lists (if applicable)

#### Screen Reader Support
- [ ] ARIA labels present on buttons
- [ ] ARIA roles correct (dialog, button, etc.)
- [ ] Live regions for dynamic content
- [ ] Alt text on images
- [ ] Form labels associated correctly
- [ ] Skip links available

#### Visual Accessibility
- [ ] Color contrast ≥4.5:1 for text
- [ ] Focus indicators visible
- [ ] Text resizable to 200% without breaking
- [ ] No content conveyed by color alone
- [ ] Motion can be reduced (prefers-reduced-motion)

### 🐛 Known Issues to Verify Fixed

#### From Previous Days
- [ ] Virtual scrolling layout shifts (Day 14 optimization)
- [ ] Image loading blocking initial render (Day 14 lazy load)
- [ ] VoiceSheet increasing initial bundle (Day 14 code split)
- [ ] Modal code splitting (Day 14 confirmation)

#### Potential New Issues
- [ ] Any console errors?
- [ ] Any console warnings?
- [ ] Any failed network requests?
- [ ] Any memory leaks?
- [ ] Any race conditions?

## Testing Execution

### Manual Testing Process

1. **Start Dev Server**:
   ```bash
   cd C:/Dev/FROK
   pnpm dev
   # Navigate to http://localhost:3004
   ```

2. **Browser Testing Sequence**:
   - Chrome (primary) → Firefox → Safari (if available)
   - For each browser: Core functionality → Performance → Responsive

3. **Responsive Testing**:
   - Use Chrome DevTools Device Toolbar
   - Test each breakpoint: 375px, 768px, 1024px, 1440px
   - Test both portrait and landscape

4. **Document Issues**:
   - Create issues in `claudedocs/DAY15_ISSUES.md`
   - Note severity: Critical, High, Medium, Low
   - Include screenshots/recordings if possible

### Automated Testing (Playwright)

**Test Suite Location**: `apps/web/tests/`

**Commands**:
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e tests/chat.spec.ts

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run in specific browser
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

**Priority Tests to Add**:
1. Chat message sending flow
2. File upload flow
3. Thread switching
4. Responsive layout changes
5. Accessibility keyboard navigation

## Success Criteria

### Must Pass (Critical)
- ✅ Zero critical bugs in Chrome/Edge
- ✅ Zero console errors in production build
- ✅ All core chat features functional
- ✅ Responsive breakpoints working
- ✅ Performance metrics within targets
- ✅ 100% design token compliance

### Should Pass (Important)
- ✅ Firefox compatibility with fallbacks
- ✅ Safari iOS gestures working
- ✅ All accessibility checks passing
- ✅ Bundle size under target
- ✅ Zero memory leaks in 30min test

### Nice to Have (Optional)
- ✅ Safari macOS testing complete
- ✅ All Playwright tests passing
- ✅ Performance optimization beyond targets
- ✅ Additional accessibility enhancements

## Next Steps After Testing

1. **Document Issues** → `DAY15_ISSUES.md`
2. **Prioritize Fixes** → Critical first, then high
3. **Apply UX Tweaks** → Based on testing feedback
4. **Re-test Fixed Issues** → Verify fixes work
5. **Update IMPLEMENTATION_PLAN.md** → Mark Day 15 complete
6. **Prepare for Deployment** → If all tests pass

---

**Note**: This testing plan covers the comprehensive validation needed for Day 15. Execute tests systematically and document all findings. Focus on critical issues first, then work through the priority list.
