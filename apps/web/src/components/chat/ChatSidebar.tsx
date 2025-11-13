'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@frok/ui';
import { useUnifiedChatStore, type Thread } from '@/store/unifiedChatStore';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { useGestures } from '@/hooks/useGestures';
import { useHaptic } from '@/hooks/useHaptic';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// ChatSidebar Component
// ============================================================================

export function ChatSidebar() {
  const t = useTranslations('chat.sidebar');

  // Store state
  const threads = useUnifiedChatStore((state) => state.threads);
  const activeThreadId = useUnifiedChatStore((state) => state.activeThreadId);
  const setActiveThread = useUnifiedChatStore((state) => state.setActiveThread);
  const createThread = useUnifiedChatStore((state) => state.createThread);
  const deleteThread = useUnifiedChatStore((state) => state.deleteThread);
  const pinThread = useUnifiedChatStore((state) => state.pinThread);
  const archiveThread = useUnifiedChatStore((state) => state.archiveThread);

  // Local state
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter threads
  const filteredThreads = useMemo(() => {
    let result = threads;

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((thread) =>
        thread.title.toLowerCase().includes(query)
      );
    }

    // Filter archived
    if (!showArchived) {
      result = result.filter((thread) => !thread.archived);
    }

    // Sort: pinned first, then by lastMessageAt/updatedAt
    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      const aTime = a.lastMessageAt || a.updatedAt;
      const bTime = b.lastMessageAt || b.updatedAt;
      return bTime - aTime;
    });
  }, [threads, search, showArchived]);

  // Handle new thread creation
  function handleNewThread() {
    const threadId = createThread('New Chat', 'default');
    setActiveThread(threadId);
  }

  // Handle thread selection
  function handleSelectThread(threadId: string) {
    setActiveThread(threadId);
  }

  // Handle thread deletion (with confirmation)
  function handleDeleteThread(threadId: string) {
    setDeleteConfirmId(threadId);
  }

  function confirmDelete() {
    if (deleteConfirmId) {
      deleteThread(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border p-3">
        <h2 className="flex-1 text-sm font-semibold text-foreground">
          {t('title')}
        </h2>
        <Button size="sm" variant="primary" onClick={handleNewThread}>
          {t('new')}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 border-b border-border p-2">
        {/* Search Input */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Archived Toggle */}
        <label className="flex items-center gap-2 text-xs text-foreground/70">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
          />
          {t('archived')}
        </label>
      </div>

      {/* Thread List */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout">
          {filteredThreads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onSelect={handleSelectThread}
              onPin={(pinned) => pinThread(thread.id, pinned)}
              onArchive={() => archiveThread(thread.id)}
              onDelete={handleDeleteThread}
            />
          ))}
        </AnimatePresence>

        {filteredThreads.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 text-center text-xs text-foreground/60"
          >
            {search.trim() ? t('noSearchResults') : t('noThreads')}
          </motion.div>
        )}
      </nav>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <DeleteConfirmModal
          open={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </aside>
  );
}

// ============================================================================
// ThreadItem Component
// ============================================================================

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  onSelect: (id: string) => void;
  onPin: (pinned: boolean) => void;
  onArchive: () => void;
  onDelete: (id: string) => void;
}

function ThreadItem({
  thread,
  isActive,
  onSelect,
  onPin,
  onArchive,
  onDelete,
}: ThreadItemProps) {
  const t = useTranslations('chat.sidebar');
  const [showActions, setShowActions] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeActions, setShowSwipeActions] = useState(false);

  const { vibrate } = useHaptic();

  // Format last activity time
  const lastActivity = thread.lastMessageAt || thread.updatedAt;
  const timeAgo = useMemo(
    () => formatDistanceToNow(lastActivity, { addSuffix: true }),
    [lastActivity]
  );

  // Gesture handlers
  const gestureRef = useGestures(
    {
      onSwipeLeft: () => {
        vibrate('light');
        setShowSwipeActions(true);
      },
      onSwipeRight: () => {
        vibrate('light');
        setShowSwipeActions(true);
      },
      onLongPress: () => {
        vibrate('medium');
        setShowSwipeActions(true);
      },
      onDragMove: (deltaX) => {
        // Only on mobile
        if (window.innerWidth < 768) {
          const maxSwipe = 80;
          const clampedOffset = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
          setSwipeOffset(clampedOffset);

          if (Math.abs(clampedOffset) > 30 && !showSwipeActions) {
            vibrate('light');
            setShowSwipeActions(true);
          }
        }
      },
      onDragEnd: (deltaX) => {
        const threshold = 50;

        if (Math.abs(deltaX) > threshold) {
          if (deltaX < 0) {
            // Swipe left to delete
            vibrate('medium');
            onDelete(thread.id);
          } else if (deltaX > 0) {
            // Swipe right to archive
            vibrate('success');
            onArchive();
          }
        }

        setSwipeOffset(0);
        setTimeout(() => setShowSwipeActions(false), 2000);
      },
    },
    {
      swipeThreshold: 50,
      longPressDelay: 500,
      dragThreshold: 10,
    }
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className="relative"
    >
      {/* Swipe Action Hints (Mobile only) */}
      {showSwipeActions && (
        <div className="absolute inset-0 flex items-center justify-between px-3 md:hidden">
          <div className="flex items-center gap-1 text-warning text-xs">
            <span>📁</span>
            <span>Archive</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-danger text-xs">
            <span>Delete</span>
            <span>🗑️</span>
          </div>
        </div>
      )}

      <motion.div
        ref={gestureRef as React.RefObject<HTMLDivElement>}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative"
      >
      <button
        type="button"
        onClick={() => onSelect(thread.id)}
        className={`group relative w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
          isActive
            ? 'bg-surface text-primary border border-primary'
            : 'border border-transparent hover:bg-surface text-foreground/80'
        }`}
      >
        {/* Pin Indicator */}
        {thread.pinned && (
          <div
            className="absolute left-1 top-1 h-2 w-2 rounded-full bg-primary"
            aria-label="Pinned"
          />
        )}

        {/* Thread Title */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {thread.title || t('untitled')}
            </div>
            {thread.messageCount !== undefined && thread.messageCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <span>{thread.messageCount} messages</span>
                <span>•</span>
                <span>{timeAgo}</span>
              </div>
            )}
          </div>

          {/* Archived Badge */}
          {thread.archived && (
            <span className="rounded bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
              Archived
            </span>
          )}
        </div>

        {/* Actions (Show on hover) */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-2 top-2 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pin Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(!thread.pinned);
                }}
                aria-label={thread.pinned ? t('unpin') : t('pin')}
                className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface/80 text-foreground/70 hover:text-foreground transition-colors"
              >
                {thread.pinned ? (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
                    <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z" />
                  </svg>
                )}
              </button>

              {/* Archive Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                }}
                aria-label={thread.archived ? t('unarchive') : t('archive')}
                className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface/80 text-foreground/70 hover:text-foreground transition-colors"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(thread.id);
                }}
                aria-label={t('delete')}
                className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface/80 text-foreground/70 hover:border-danger hover:text-danger transition-colors"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ open, onClose, onConfirm }: DeleteConfirmModalProps) {
  const t = useTranslations('chat.sidebar');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-foreground">
          {t('deleteTitle')}
        </h3>
        <p className="mt-2 text-sm text-foreground/70">
          {t('deleteDescription')}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {t('deleteButton')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
