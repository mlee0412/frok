'use client';

import { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useUnifiedChatStore, useActiveThread } from '@/store/unifiedChatStore';
import { useTranslations } from '@/lib/i18n/I18nProvider';

// ============================================================================
// ChatBottomSheet - Mobile thread navigation
// ============================================================================

/**
 * ChatBottomSheet - Mobile-optimized thread selector
 *
 * Features:
 * - Swipe gesture to expand/collapse
 * - Three states: collapsed, peek, expanded
 * - Thumb-zone optimized for one-handed use
 * - Haptic feedback on iOS
 * - Smooth spring animations
 *
 * Collapsed: 0px (hidden)
 * Peek: 80px (shows current thread)
 * Expanded: 60vh (shows thread list)
 */
export function ChatBottomSheet() {
  const t = useTranslations('chat.sidebar');

  // Store state
  const threads = useUnifiedChatStore((state) => state.threads);
  const activeThread = useActiveThread();
  const setActiveThread = useUnifiedChatStore((state) => state.setActiveThread);
  const createThread = useUnifiedChatStore((state) => state.createThread);

  // Sheet state: 'collapsed' | 'peek' | 'expanded'
  const [sheetState, setSheetState] = useState<'collapsed' | 'peek' | 'expanded'>('peek');

  // Drag handlers
  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const threshold = 50; // pixels
    const velocity = info.velocity.y;

    // Swipe down: collapse
    if (info.offset.y > threshold || velocity > 500) {
      setSheetState('peek');
      triggerHaptic('light');
    }
    // Swipe up: expand
    else if (info.offset.y < -threshold || velocity < -500) {
      setSheetState('expanded');
      triggerHaptic('light');
    }
  }

  // Handle thread selection
  function handleSelectThread(threadId: string) {
    setActiveThread(threadId);
    setSheetState('peek');
    triggerHaptic('medium');
  }

  // Handle new thread
  function handleNewThread() {
    const threadId = createThread('New Chat', 'default');
    setActiveThread(threadId);
    setSheetState('peek');
    triggerHaptic('medium');
  }

  // Keyboard shortcut: Cmd/Ctrl + K to expand
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSheetState((prev) => (prev === 'expanded' ? 'peek' : 'expanded'));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter: only show non-archived threads
  const activeThreads = threads.filter((t) => !t.archived);

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      animate={{
        height: sheetState === 'collapsed' ? 0 : sheetState === 'peek' ? 80 : '60vh',
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className="fixed bottom-0 left-0 right-0 z-30 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface/95 backdrop-blur-md shadow-2xl"
    >
      {/* Drag Handle */}
      <div className="flex items-center justify-center py-2">
        <div className="h-1 w-12 rounded-full bg-foreground/30" aria-hidden="true" />
      </div>

      {/* Peek View: Current Thread */}
      {sheetState === 'peek' && activeThread && (
        <button
          type="button"
          onClick={() => setSheetState('expanded')}
          className="flex flex-1 items-center gap-3 px-4 pb-4 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-foreground">
              {activeThread.title}
            </div>
            <div className="text-xs text-foreground/60">
              {activeThread.messageCount || 0} messages
            </div>
          </div>
          <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* Expanded View: Thread List */}
      {sheetState === 'expanded' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 pb-3">
            <h2 className="flex-1 text-sm font-semibold text-foreground">
              {t('title')}
            </h2>
            <button
              type="button"
              onClick={handleNewThread}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
            >
              {t('new')}
            </button>
            <button
              type="button"
              onClick={() => setSheetState('peek')}
              aria-label="Collapse"
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Thread List */}
          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {activeThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => handleSelectThread(thread.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  thread.id === activeThread?.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-surface/60 text-foreground hover:border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  {thread.pinned && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{thread.title || t('untitled')}</div>
                    <div className="text-xs text-foreground/60">
                      {thread.messageCount || 0} messages
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {activeThreads.length === 0 && (
              <div className="py-8 text-center text-sm text-foreground/60">
                {t('noThreads')}
              </div>
            )}
          </nav>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Haptic Feedback Helper
// ============================================================================

function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  // Only works on iOS with webkit
  if ('vibrate' in navigator) {
    const durations = {
      light: 10,
      medium: 20,
      heavy: 30,
    };
    navigator.vibrate(durations[style]);
  }

  // iOS Haptic Feedback API (if available)
  if ('haptic' in navigator && typeof (navigator as any).haptic?.impact === 'function') {
    const haptic = (navigator as any).haptic;
    haptic.impact(style);
  }
}
