'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCard } from './MessageCard';
import { useUnifiedChatStore, type Message } from '@/store/unifiedChatStore';
import { useTranslations } from '@/lib/i18n/I18nProvider';

// ============================================================================
// MessageList Component
// ============================================================================

/**
 * MessageList - Virtualized message list with performance optimization
 *
 * Features:
 * - Virtual scrolling for 1000+ messages (uses @tanstack/react-virtual)
 * - Auto-scroll to bottom on new messages
 * - Loading states (skeleton)
 * - Empty state with suggested prompts
 * - Streaming message support
 * - Edit mode integration
 * - Copy/regenerate/delete actions
 * - Scroll-to-bottom button when not at bottom
 * - Compact mode toggle
 */

export interface MessageListProps {
  threadId: string;
  isCompact?: boolean;
  isLoading?: boolean;
  streamingContent?: string;
  onSendMessage?: (content: string) => void;
}

export const MessageList = memo(function MessageList({
  threadId,
  isCompact = false,
  isLoading = false,
  streamingContent = '',
}: MessageListProps) {
  const t = useTranslations('chat.messages');

  // Store state
  const messages = useUnifiedChatStore((state) => state.messages[threadId] || []);
  const deleteMessage = useUnifiedChatStore((state) => state.deleteMessage);
  // const updateMessage = useUnifiedChatStore((state) => state.updateMessage); // TODO: Implement edit functionality

  // Local state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Refs
  const parentRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: messages.length + (streamingContent ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated message height
    overscan: 5, // Render 5 extra items outside viewport
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 || streamingContent) {
      // Check if user is near bottom (within 200px)
      const container = parentRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 200;

        if (isNearBottom) {
          lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [messages.length, streamingContent]);

  // Handle scroll for scroll-to-bottom button
  const handleScroll = () => {
    const container = parentRef.current;
    if (container) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    }
  };

  // Scroll to bottom manually
  const scrollToBottom = () => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Message actions
  const handleCopyMessage = (message: Message) => {
    navigator.clipboard.writeText(message.content);
    // TODO: Add toast notification
  };

  const handleRegenerateMessage = (message: Message) => {
    // TODO: Implement regeneration logic
    console.log('Regenerate:', message.id);
  };

  const handleEditMessage = (messageId: string) => {
    setEditingMessageId(messageId);
  };

  // const handleSaveEdit = (_messageId: string, _newContent: string) => {
  //   // TODO: Implement edit functionality
  //   // updateMessage(threadId, messageId, { content: newContent });
  //   setEditingMessageId(null);
  // };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(threadId, messageId);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <MessageSkeleton />
        <MessageSkeleton isUser />
        <MessageSkeleton />
      </div>
    );
  }

  // Empty state
  if (messages.length === 0 && !streamingContent) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-4 text-6xl">💬</div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t('emptyTitle')}
          </h3>
          <p className="text-sm text-foreground/60">{t('emptyDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Virtualized Message List */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="popLayout">
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const isStreamingMessage = virtualRow.index === messages.length;

              if (isStreamingMessage) {
                // Streaming message
                return (
                  <div
                    key="streaming"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    ref={lastMessageRef}
                  >
                    <StreamingMessage content={streamingContent} />
                  </div>
                );
              }

              const message = messages[virtualRow.index];
              if (!message) return null;

              const isLastMessage = virtualRow.index === messages.length - 1;

              return (
                <div
                  key={message.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  ref={isLastMessage ? lastMessageRef : undefined}
                >
                  <div className="mb-6">
                    <MessageCard
                      message={message}
                      isEditing={editingMessageId === message.id}
                      isCompact={isCompact}
                      showActions
                      onCopy={() => handleCopyMessage(message)}
                      onRegenerate={
                        message.role === 'assistant'
                          ? () => handleRegenerateMessage(message)
                          : undefined
                      }
                      onEdit={
                        message.role === 'user'
                          ? () => handleEditMessage(message.id)
                          : undefined
                      }
                      onDelete={() => handleDeleteMessage(message.id)}
                      onCancelEdit={handleCancelEdit}
                    />
                  </div>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface shadow-lg hover:border-primary hover:bg-primary/10 transition-colors"
            title={t('scrollToBottom')}
          >
            <svg
              className="h-5 w-5 text-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// StreamingMessage Component
// ============================================================================

interface StreamingMessageProps {
  content: string;
}

function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-full rounded-2xl border border-border bg-surface px-5 py-4 backdrop-blur-sm sm:max-w-3xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="text-xs font-medium opacity-70">Assistant</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-primary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            Thinking...
          </span>
        </div>
        <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap break-words">
          {content}
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MessageSkeleton Component
// ============================================================================

interface MessageSkeletonProps {
  isUser?: boolean;
}

function MessageSkeleton({ isUser = false }: MessageSkeletonProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-full space-y-2 rounded-2xl border border-border bg-surface/50 px-5 py-4 backdrop-blur-sm animate-pulse sm:max-w-3xl">
        <div className="h-4 w-16 rounded bg-surface" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-surface" />
          <div className="h-3 w-5/6 rounded bg-surface" />
          <div className="h-3 w-4/6 rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}
