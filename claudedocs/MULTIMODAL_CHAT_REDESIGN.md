# Multimodal Chat Interface Redesign

**Session**: #15 - Multimodal Chat Redesign
**Status**: In Progress
**Goal**: Unified, mobile-first, visually stunning chat interface integrating text, voice, and file capabilities

---

## Executive Summary

Transform FROK's three fragmented chat interfaces (`/agent`, `/voice`, `/chatkit`) into a **unified multimodal chat experience** with:

- **Seamless modality switching**: Text ↔ Voice without interruption
- **Mobile-first design**: Native mobile experience, not responsive desktop
- **Stunning visual design**: Modern, fluid animations, smooth interactions
- **Component extraction**: Reusable, testable, maintainable architecture
- **Unified state**: Single source of truth across all modalities

---

## Current State Analysis

### Problems Identified

1. **Architectural Fragmentation**
   - Agent page: 2,800 LOC monolith, 30+ useState hooks
   - Voice page: Isolated Zustand store, no persistence
   - ChatKit page: Experimental SDK, disconnected
   - **Result**: Cannot share conversations across modalities

2. **Mobile Experience Issues**
   - Desktop-first with responsive classes
   - No gesture controls (swipe, long-press, drag)
   - BottomTabBar/MobileHeader not integrated
   - Inconsistent navigation patterns

3. **State Management Chaos**
   - Agent: Local useState (not using existing `chatStore`)
   - Voice: `voiceStore` (not integrated with chat)
   - ChatKit: Internal SDK state
   - **Result**: Duplicate logic, no state sharing

4. **Component Coupling**
   - ChatSidebar embedded in page
   - MessageList embedded in page
   - ChatInput embedded in page
   - **Result**: Cannot reuse, hard to test

---

## Design Principles

### 1. Mobile-First Philosophy
- Design for mobile, enhance for desktop (not reverse)
- Touch-first interactions (swipe, long-press, drag)
- Thumb-zone optimized (bottom 40% of screen)
- Native feel (haptics, smooth 60fps animations)

### 2. Modality Agnostic
- Same conversation, different input methods
- Seamless switching (text → voice → text)
- Unified history (voice transcripts = messages)
- Persistent across sessions

### 3. Component Modularity
- Small, focused, single-responsibility components
- Composable (MessageCard + MessageList + ChatLayout)
- Testable in isolation
- Reusable across contexts

### 4. Visual Excellence
- Fluid animations (Framer Motion for complex, CSS for simple)
- Smooth state transitions (loading → success → error)
- Microinteractions (hover, focus, active states)
- Accessibility first (WCAG 2.1 AA minimum)

---

## Architecture Design

### Component Hierarchy

```
<ChatEngine>                                    # State management layer
├─ <ChatLayout variant="mobile|desktop">       # Adaptive layout shell
│  │
│  ├─ Desktop Layout
│  │  ├─ <ChatSidebar />                       # Thread list + search
│  │  ├─ <MessageContainer />                  # Main chat area
│  │  │  ├─ <ChatHeader />                     # Thread title + actions
│  │  │  ├─ <MessageList />                    # Virtualized message list
│  │  │  │  └─ <MessageCard />                 # Single message
│  │  │  │     ├─ <MessageContent />           # Text/markdown rendering
│  │  │  │     ├─ <MessageActions />           # Copy, edit, regenerate
│  │  │  │     ├─ <ToolUsageDisplay />         # Tool execution viz
│  │  │  │     └─ <MessageMetadata />          # Timestamp, model, etc.
│  │  │  └─ <ChatInput />                      # Input + voice + files
│  │  │     ├─ <TextInput />                   # Textarea with autocomplete
│  │  │     ├─ <VoiceButton />                 # Voice recording toggle
│  │  │     ├─ <FileUpload />                  # File attachment
│  │  │     └─ <SendButton />                  # Submit message
│  │  └─ <QuickActions />                      # Floating action button
│  │
│  └─ Mobile Layout
│     ├─ <MobileHeader />                      # Clock, weather, status
│     ├─ <MessageContainer />                  # Same as desktop
│     ├─ <ChatBottomSheet />                   # Swipe-up thread list
│     ├─ <BottomTabBar />                      # Navigation tabs
│     └─ <VoiceOverlay />                      # Fullscreen voice mode
│
├─ <VoiceInterface />                          # Real-time voice layer
│  ├─ <VoiceVisualizer />                      # Audio waveform/levels
│  ├─ <TranscriptDisplay />                    # Live STT transcript
│  ├─ <VoiceControls />                        # Start/stop/mute
│  └─ <ConnectionStatus />                     # WebSocket status
│
└─ <ChatModals />                              # Lazy-loaded modals
   ├─ <ThreadOptionsModal />                   # Edit, delete, share
   ├─ <AgentMemoryModal />                     # Agent memory mgmt
   ├─ <UserMemoriesModal />                    # User memory mgmt
   └─ <TTSSettingsModal />                     # Voice settings
```

### State Architecture

#### Unified Chat Store (Zustand)

```typescript
// apps/web/src/store/unifiedChatStore.ts

interface UnifiedChatStore {
  // Thread Management
  threads: Thread[]
  activeThreadId: string | null

  // Message Management
  messages: Record<string, Message[]>  // threadId → messages
  streamingMessageId: string | null
  streamingContent: string

  // Input State
  inputValue: string
  files: File[]

  // Voice State
  voiceMode: 'idle' | 'listening' | 'processing' | 'speaking'
  transcript: string
  isVoiceConnected: boolean

  // UI State
  sidebarOpen: boolean
  modalOpen: 'thread-options' | 'agent-memory' | 'user-memory' | 'tts-settings' | null

  // Actions - Thread
  createThread: () => Promise<Thread>
  deleteThread: (id: string) => Promise<void>
  updateThread: (id: string, updates: Partial<Thread>) => Promise<void>
  setActiveThread: (id: string) => void

  // Actions - Message
  sendMessage: (content: string, files?: File[]) => Promise<void>
  streamMessage: (content: string) => Promise<void>
  editMessage: (messageId: string, newContent: string) => Promise<void>
  regenerateMessage: (messageId: string) => Promise<void>
  branchFromMessage: (messageId: string) => Promise<Thread>

  // Actions - Voice
  startVoiceRecording: () => Promise<void>
  stopVoiceRecording: () => Promise<void>
  toggleTTS: () => void

  // Actions - UI
  toggleSidebar: () => void
  openModal: (modal: string) => void
  closeModal: () => void

  // Persistence
  hydrate: () => Promise<void>
  persist: () => void
}
```

#### TanStack Query Integration

```typescript
// apps/web/src/hooks/queries/useChatQueries.ts

export const useChatThreads = () => {
  return useQuery({
    queryKey: ['chat', 'threads'],
    queryFn: async () => {
      const res = await fetch('/api/chat/threads');
      return res.json();
    },
    staleTime: 30_000, // 30s
  });
};

export const useChatMessages = (threadId: string) => {
  return useQuery({
    queryKey: ['chat', 'messages', threadId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/threads/${threadId}/messages`);
      return res.json();
    },
    enabled: !!threadId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, content, files }: SendMessageParams) => {
      const formData = new FormData();
      formData.append('content', content);
      files?.forEach(f => formData.append('files', f));

      const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
        method: 'POST',
        body: formData,
      });

      return res.json();
    },
    onSuccess: (data, variables) => {
      // Optimistic update
      queryClient.setQueryData(
        ['chat', 'messages', variables.threadId],
        (old: Message[]) => [...old, data.message]
      );
    },
  });
};
```

---

## Component Design

### 1. ChatLayout Component

**Purpose**: Adaptive shell that switches between mobile and desktop layouts

**API**:
```typescript
interface ChatLayoutProps {
  variant?: 'auto' | 'mobile' | 'desktop'
  children?: React.ReactNode
}

export function ChatLayout({ variant = 'auto' }: ChatLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const effectiveVariant = variant === 'auto'
    ? (isMobile ? 'mobile' : 'desktop')
    : variant;

  return effectiveVariant === 'mobile'
    ? <MobileLayout />
    : <DesktopLayout />;
}
```

**Desktop Layout**:
```
┌────────────┬──────────────────────────────────┐
│            │                                  │
│            │   <ChatHeader />                 │
│  Chat      │   ─────────────────────────────  │
│  Sidebar   │                                  │
│            │   <MessageList />                │
│  - Thread1 │                                  │
│  - Thread2 │                                  │
│  - Thread3 │   ─────────────────────────────  │
│            │   <ChatInput />                  │
└────────────┴──────────────────────────────────┘
```

**Mobile Layout**:
```
┌──────────────────────────────────────┐
│  <MobileHeader />                    │
├──────────────────────────────────────┤
│                                      │
│  <MessageList />                     │
│                                      │
├──────────────────────────────────────┤
│  <ChatInput />                       │
├──────────────────────────────────────┤
│  [Home] [Chat] [Voice] [Settings]   │
└──────────────────────────────────────┘

Swipe up from bottom → <ChatBottomSheet /> (thread list)
```

---

### 2. MessageCard Component

**Purpose**: Display single message with actions, metadata, and tool usage

**Design Tokens**:
```css
/* Message card styling */
.message-card {
  --message-bg-user: rgba(34, 211, 238, 0.08);      /* bg-primary/10 */
  --message-bg-assistant: rgba(255, 255, 255, 0.04); /* bg-surface */
  --message-border: rgba(255, 255, 255, 0.1);        /* border-border */
  --message-radius: 12px;
  --message-padding: 16px;
  --message-gap: 12px;
}
```

**Structure**:
```tsx
<div className="message-card">
  {/* Avatar + Name */}
  <div className="message-header">
    <Avatar role={role} />
    <span className="text-sm font-medium">{role}</span>
    <span className="text-xs text-foreground/60">{timestamp}</span>
  </div>

  {/* Content */}
  <MessageContent content={content} />

  {/* Tool Usage (if any) */}
  {toolUse && <ToolUsageDisplay tools={toolUse} />}

  {/* Actions (hover/focus) */}
  <MessageActions
    onCopy={() => copy(content)}
    onEdit={() => startEdit()}
    onRegenerate={() => regenerate()}
    onBranch={() => createBranch()}
  />

  {/* Metadata (collapsible) */}
  <MessageMetadata
    model={model}
    tokensIn={tokensIn}
    tokensOut={tokensOut}
    executionTime={executionTime}
  />
</div>
```

---

### 3. ChatInput Component

**Purpose**: Multimodal input (text, voice, files) with smooth UX

**Features**:
- Auto-growing textarea (1 → 4 lines)
- Voice recording with waveform visualization
- File upload with preview
- Keyboard shortcuts (Cmd+Enter to send)
- Suggested prompts when empty

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│ [📎] [🎤] ┌──────────────────────────────────┐ [Send] │
│           │  Type a message...               │        │
│           │                                  │        │
│           └──────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘

Voice active:
┌─────────────────────────────────────────────────────────┐
│ [●] Recording...  ▂▄▅▇▅▄▂  00:03               [Stop]  │
└─────────────────────────────────────────────────────────┘

Files attached:
┌─────────────────────────────────────────────────────────┐
│ [image.png ✕] [document.pdf ✕]                         │
│ [📎] [🎤] ┌──────────────────────────────────┐ [Send] │
│           │  Describe these...               │        │
└─────────────────────────────────────────────────────────┘
```

---

### 4. VoiceInterface Component

**Purpose**: Fullscreen/overlay voice conversation mode

**Desktop**:
- Modal overlay (80% width, centered)
- Audio waveform visualization
- Live transcript
- Connection status

**Mobile**:
- Fullscreen takeover
- Large touch targets (min 44x44px)
- Swipe down to dismiss
- Haptic feedback on state changes

**Visual Design (Mobile)**:
```
┌──────────────────────────────────────┐
│  [✕]              Voice              │ ← Header (swipe down)
├──────────────────────────────────────┤
│                                      │
│      ●                               │ ← Connection status
│      Listening...                    │
│                                      │
│      ▂▄▅▇█▇▅▄▂                       │ ← Audio visualizer
│                                      │
│  ┌────────────────────────────────┐ │
│  │ User: "Set the living room     │ │
│  │       lights to 50%"           │ │
│  │                                │ │
│  │ Assistant: "I'll adjust the   │ │
│  │            lights for you."    │ │
│  └────────────────────────────────┘ │ ← Transcript
│                                      │
│      [●]                             │ ← Large stop button
│      Stop                            │   (thumb zone)
└──────────────────────────────────────┘
```

---

### 5. ChatBottomSheet Component (Mobile)

**Purpose**: Swipe-up thread list for mobile

**Behavior**:
- **Default**: Hidden below screen
- **Peek**: Drag up 20% to show preview (thread count)
- **Half**: Drag up 50% to show recent threads (5-10)
- **Full**: Drag up 100% to show all threads with search
- **Dismiss**: Swipe down or tap backdrop

**Visual Design**:
```
┌──────────────────────────────────────┐
│  ────  (drag handle)                 │
│  📝  4 conversations                 │
├──────────────────────────────────────┤
│  🔍 Search threads...                │
├──────────────────────────────────────┤
│  📌  Important thread title          │
│      Last message preview...         │
├──────────────────────────────────────┤
│  💬  Another thread                  │
│      Preview text...                 │
├──────────────────────────────────────┤
│  💬  Older thread                    │
│      Preview...                      │
└──────────────────────────────────────┘
```

---

## Visual Design System

### Color Palette

**Already defined** in `packages/ui/styles/tokens.css`:

```css
:root {
  /* Layout */
  --color-background: #0a0a0a;
  --color-surface: rgba(255, 255, 255, 0.04);
  --color-border: rgba(255, 255, 255, 0.1);

  /* Text */
  --color-foreground: #ededed;
  --color-foreground-muted: rgba(237, 237, 237, 0.7);
  --color-foreground-subtle: rgba(237, 237, 237, 0.6);

  /* Semantic */
  --color-primary: #22d3ee;           /* cyan */
  --color-accent: #3b82f6;            /* blue */
  --color-success: #22c55e;           /* green */
  --color-warning: #f59e0b;           /* amber */
  --color-danger: #ef4444;            /* red */
  --color-info: #06b6d4;              /* cyan darker */
}
```

### Typography Scale

```css
/* Font sizes (Tailwind defaults) */
.text-xs    { font-size: 0.75rem; }   /* 12px */
.text-sm    { font-size: 0.875rem; }  /* 14px */
.text-base  { font-size: 1rem; }      /* 16px */
.text-lg    { font-size: 1.125rem; }  /* 18px */
.text-xl    { font-size: 1.25rem; }   /* 20px */
.text-2xl   { font-size: 1.5rem; }    /* 24px */
```

### Spacing Scale

```css
/* Spacing (Tailwind defaults) */
.space-1  { 0.25rem }  /* 4px */
.space-2  { 0.5rem }   /* 8px */
.space-3  { 0.75rem }  /* 12px */
.space-4  { 1rem }     /* 16px */
.space-6  { 1.5rem }   /* 24px */
.space-8  { 2rem }     /* 32px */
```

### Animation Tokens

```css
/* Transitions */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Easing */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0.0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## Mobile-Specific Interactions

### Gesture Controls

#### Swipe Gestures
- **Swipe left** on message → Quick actions (copy, edit, delete)
- **Swipe right** on message → Reply/quote
- **Swipe up** from bottom → Open thread list (BottomSheet)
- **Swipe down** on BottomSheet → Dismiss
- **Swipe down** on VoiceOverlay → Exit voice mode

#### Long-Press Gestures
- **Long-press** message → Context menu (copy, edit, share, delete)
- **Long-press** thread → Quick actions (pin, archive, delete)
- **Long-press** send button → Voice recording (hold-to-talk)

#### Pull-to-Refresh
- **Pull down** on MessageList → Load older messages
- **Pull down** on ChatBottomSheet → Refresh thread list

### Haptic Feedback

```typescript
// Utility for haptic feedback
export const haptic = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(20),
  heavy: () => navigator.vibrate?.(30),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error: () => navigator.vibrate?.([20, 100, 20]),
};

// Usage
haptic.light();  // On button press
haptic.medium(); // On state change
haptic.success(); // On message sent
haptic.error();  // On error
```

### Touch Targets

**Minimum sizes** (WCAG 2.1 Level AAA):
- Buttons: 44x44px minimum
- Icons: 48x48px touch area
- List items: 48px min height
- Input fields: 44px min height

---

## Animation Strategy

### Microinteractions

#### Message Appearance
```typescript
// Framer Motion variants
const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

<motion.div variants={messageVariants} initial="hidden" animate="visible">
  <MessageCard />
</motion.div>
```

#### Streaming Text
```typescript
// Typewriter effect for streaming
const StreamingText = ({ content }: { content: string }) => {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      {content}
      <motion.span
        className="inline-block w-1 h-4 bg-primary ml-0.5"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    </motion.span>
  );
};
```

#### Loading States
```typescript
// Skeleton loading for messages
const MessageSkeleton = () => (
  <div className="space-y-2">
    <div className="h-4 bg-surface/50 rounded animate-pulse w-3/4" />
    <div className="h-4 bg-surface/50 rounded animate-pulse w-full" />
    <div className="h-4 bg-surface/50 rounded animate-pulse w-2/3" />
  </div>
);
```

### Page Transitions

#### Mobile Navigation
```typescript
// Bottom tab bar item animation
const tabVariants = {
  active: { scale: 1.1, y: -4 },
  inactive: { scale: 1, y: 0 }
};

<motion.div
  variants={tabVariants}
  animate={isActive ? 'active' : 'inactive'}
>
  <TabIcon />
</motion.div>
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goals**: Extract core components, unify state

1. **Create `unifiedChatStore.ts`** ✅ Core state management
   - Thread CRUD operations
   - Message CRUD operations
   - Voice state integration
   - Persistence layer

2. **Extract `<ChatLayout>`** ✅ Adaptive layout shell
   - Desktop/mobile variants
   - useMediaQuery hook
   - Layout switching logic

3. **Extract `<MessageCard>`** ✅ Reusable message display
   - Content rendering (markdown)
   - Actions (copy, edit, regenerate)
   - Metadata display
   - Tool usage visualization

4. **Extract `<ChatInput>`** ✅ Multimodal input
   - Textarea with auto-grow
   - Voice button integration
   - File upload with preview
   - Send button with loading state

### Phase 2: Mobile Experience (Week 2)

**Goals**: Build mobile-first components

1. **Create `<ChatBottomSheet>`** ✅ Swipeable thread list
   - Drag handle
   - Snap points (peek, half, full)
   - Thread list with search
   - Smooth animations

2. **Enhance `<VoiceInterface>`** ✅ Fullscreen voice mode
   - Mobile: fullscreen takeover
   - Desktop: modal overlay
   - Audio visualizer
   - Live transcript
   - Connection status

3. **Build Mobile Gestures** ✅ Touch interactions
   - Swipe left/right on messages
   - Long-press context menus
   - Pull-to-refresh
   - Haptic feedback

4. **Integrate `<BottomTabBar>`** ✅ Mobile navigation
   - Home, Chat, Voice, Settings tabs
   - Active state indicators
   - Badge notifications
   - Smooth transitions

### Phase 3: Visual Polish (Week 3)

**Goals**: Stunning visual design, animations

1. **Implement Animations** ✅ Framer Motion
   - Message appearance (fade + slide up)
   - Streaming text (typewriter + cursor)
   - Loading skeletons
   - Page transitions

2. **Enhance Visual Design** ✅ Design polish
   - Gradient backgrounds
   - Glassmorphism effects
   - Smooth shadows
   - Icon animations

3. **Accessibility Audit** ✅ WCAG 2.1 AA
   - Keyboard navigation
   - Screen reader support
   - Focus indicators
   - Color contrast

4. **Performance Optimization** ✅ Speed improvements
   - Virtual scrolling (react-window)
   - Image lazy loading
   - Code splitting
   - Bundle analysis

### Phase 4: Integration (Week 4)

**Goals**: Unify all modalities

1. **Voice Integration** ✅ Seamless voice ↔ text
   - Voice transcripts as messages
   - Switch mid-conversation
   - Persistent history
   - TTS on any message

2. **File Upload Integration** ✅ Multimodal attachments
   - Drag & drop
   - Preview generation
   - Progress indicators
   - Error handling

3. **ChatKit Migration** ✅ Sunset experimental page
   - Migrate users to unified chat
   - Document SDK patterns
   - Deprecate `/chatkit` page

4. **Testing & QA** ✅ Comprehensive testing
   - Unit tests (Vitest)
   - E2E tests (Playwright)
   - Mobile device testing
   - Accessibility testing

---

## Success Metrics

### User Experience
- **Modality switching**: <500ms transition time
- **Message rendering**: <100ms per message
- **Voice latency**: <200ms STT + TTS roundtrip
- **Mobile performance**: 60fps scrolling, animations

### Code Quality
- **LOC reduction**: 2,800 → <1,500 (agent page)
- **Component count**: 3 pages → 1 unified + modular components
- **Test coverage**: 60% → 80% (all new components)
- **TypeScript errors**: 0 (strict mode)

### Accessibility
- **WCAG compliance**: 2.1 Level AA (minimum)
- **Keyboard navigation**: 100% operable
- **Screen reader**: Full compatibility
- **Touch targets**: 44x44px minimum

---

## File Structure

```
apps/web/src/
├── app/
│   ├── (main)/
│   │   ├── agent/
│   │   │   └── page.tsx                    # ← Refactored (500 LOC max)
│   │   ├── voice/
│   │   │   └── page.tsx                    # ← Wrapper for VoiceInterface
│   │   └── chatkit/
│   │       └── page.tsx                    # ← Deprecated (remove after migration)
│
├── components/
│   ├── chat/                               # ← NEW: Chat components
│   │   ├── ChatLayout.tsx                  # Adaptive layout
│   │   ├── ChatHeader.tsx                  # Thread title + actions
│   │   ├── ChatSidebar.tsx                 # Desktop thread list
│   │   ├── ChatBottomSheet.tsx             # Mobile thread list
│   │   ├── MessageList.tsx                 # Virtualized message list
│   │   ├── MessageCard.tsx                 # Single message display
│   │   ├── MessageContent.tsx              # Markdown rendering
│   │   ├── MessageActions.tsx              # Copy, edit, regenerate
│   │   ├── MessageMetadata.tsx             # Model, tokens, time
│   │   ├── ChatInput.tsx                   # Multimodal input
│   │   ├── ToolUsageDisplay.tsx            # Tool execution viz
│   │   └── index.ts                        # Barrel export
│   │
│   ├── voice/                              # ← ENHANCED: Voice components
│   │   ├── VoiceInterface.tsx              # Fullscreen/modal voice
│   │   ├── VoiceVisualizer.tsx             # Audio waveform
│   │   ├── TranscriptDisplay.tsx           # Live transcript
│   │   ├── VoiceControls.tsx               # Start/stop/mute
│   │   ├── ConnectionStatus.tsx            # WebSocket status
│   │   └── index.ts
│   │
│   └── mobile/                             # ← ENHANCED: Mobile components
│       ├── BottomTabBar.tsx                # Navigation tabs
│       ├── MobileHeader.tsx                # Clock, weather, status
│       └── index.ts
│
├── store/
│   ├── unifiedChatStore.ts                 # ← NEW: Unified state
│   ├── chatStore.ts                        # ← Deprecated (migrate)
│   └── voiceStore.ts                       # ← Deprecated (migrate)
│
├── hooks/
│   ├── queries/
│   │   ├── useChatQueries.ts               # ← ENHANCED: TanStack Query
│   │   ├── useVoiceQueries.ts              # Voice-specific queries
│   │   └── index.ts
│   │
│   ├── useChatLayout.ts                    # Layout state/logic
│   ├── useVoiceRecording.ts                # Voice recording logic
│   ├── useGestures.ts                      # Touch gesture handlers
│   └── useHaptic.ts                        # Haptic feedback utility
│
└── lib/
    ├── chat/
    │   ├── messageFormatting.ts            # Markdown, syntax highlighting
    │   ├── threadUtils.ts                  # Thread CRUD helpers
    │   └── streamingUtils.ts               # SSE streaming helpers
    │
    └── voice/
        ├── websocketManager.ts             # Existing WebSocket manager
        ├── audioStreamer.ts                # Existing audio streaming
        └── voiceActivityDetector.ts        # Existing VAD
```

---

## Next Steps

1. **Review & Approve Design** ✅ Stakeholder sign-off
2. **Create Component Stubs** → Skeleton files with TypeScript interfaces
3. **Implement Phase 1** → Foundation (state + core components)
4. **Implement Phase 2** → Mobile experience
5. **Implement Phase 3** → Visual polish
6. **Implement Phase 4** → Integration + testing
7. **Deploy & Monitor** → Rollout with feature flag

---

**Estimated Timeline**: 4 weeks
**Risk Level**: Medium (architectural refactor + mobile optimization)
**Impact**: High (unified UX, reduced maintenance, better mobile experience)
