'use client';

import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { useGestures } from '@/hooks/useGestures';
import { useHaptic } from '@/hooks/useHaptic';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { MessageContent } from '@/components/MessageContent';
import type { Message, ToolCall } from '@/store/unifiedChatStore';

// ============================================================================
// MessageCard Component
// ============================================================================

/**
 * MessageCard - Individual message display with role-based styling
 *
 * Features:
 * - Role-based styling (user/assistant/system)
 * - Voice message indicators (source === 'voice')
 * - Tool call visualization with expandable details
 * - Thinking process display (metadata.thinkingProcess)
 * - File attachment preview (fileUrls array)
 * - Copy/regenerate/edit/delete actions
 * - Framer Motion enter/exit animations
 * - Markdown rendering for assistant messages
 * - Code syntax highlighting
 * - Metadata badges (model, complexity, routing, tools, execution time)
 */

export interface MessageCardProps {
  message: Message;
  isEditing?: boolean;
  isCompact?: boolean;
  showActions?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onCancelEdit?: () => void;
}

export const MessageCard = memo(function MessageCard({
  message,
  isEditing = false,
  isCompact = false,
  showActions = true,
  onCopy,
  onRegenerate,
  onEdit,
  onDelete,
  onCancelEdit,
}: MessageCardProps) {
  const t = useTranslations('chat.messages');
  const [editContent, setEditContent] = useState(message.content);
  const [showToolCalls, setShowToolCalls] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeActions, setShowSwipeActions] = useState(false);

  const { vibrate } = useHaptic();
  const { ttsState, currentMessageId, speak, pause, resume, stop } = useTextToSpeech();

  // Check if this message is currently being spoken
  const isSpeaking = ttsState === 'speaking' && currentMessageId === message.id;
  const isPaused = ttsState === 'paused' && currentMessageId === message.id;

  // Handle TTS controls
  const handleSpeak = () => {
    if (isSpeaking) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      speak(message.content, message.id);
    }
  };

  const handleStopSpeak = () => {
    stop();
  };

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const isVoiceMessage = message.source === 'voice';

  // Format timestamp
  const timeAgo = useMemo(
    () => formatDistanceToNow(message.timestamp, { addSuffix: true }),
    [message.timestamp]
  );

  // Extract metadata
  const toolCalls = message.metadata?.toolCalls || [];
  const thinkingProcess = message.metadata?.thinkingProcess;
  const hasToolCalls = toolCalls.length > 0;
  const hasThinking = !!thinkingProcess;

  // Message styling
  const bubbleWidthClass = isCompact ? 'max-w-full sm:max-w-2xl' : 'max-w-full sm:max-w-3xl';
  const bubblePaddingClass = isCompact ? 'px-4 py-3' : 'px-5 py-4';

  // Role-based styling
  const roleStyles = {
    user: 'bg-primary/10 border-primary/30 text-foreground',
    assistant: 'bg-surface border-border text-foreground',
    system: 'bg-warning/10 border-warning/30 text-foreground/70',
  };

  const handleSubmitEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent.trim());
    }
  };

  // Gesture handlers
  const gestureRef = useGestures(
    {
      onSwipeLeft: () => {
        if (isUser && onDelete) {
          vibrate('light');
          setShowSwipeActions(true);
        }
      },
      onSwipeRight: () => {
        if (onCopy) {
          vibrate('light');
          setShowSwipeActions(true);
        }
      },
      onLongPress: () => {
        vibrate('medium');
        setShowSwipeActions(true);
      },
      onDragMove: (deltaX) => {
        // Only allow swipe on mobile
        if (window.innerWidth < 768) {
          const maxSwipe = 100;
          const clampedOffset = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
          setSwipeOffset(clampedOffset);

          // Show actions when swiped enough
          if (Math.abs(clampedOffset) > 40 && !showSwipeActions) {
            vibrate('light');
            setShowSwipeActions(true);
          }
        }
      },
      onDragEnd: (deltaX) => {
        const threshold = 60;

        if (Math.abs(deltaX) > threshold) {
          // Execute action
          if (deltaX < 0 && isUser && onDelete) {
            // Swipe left to delete
            vibrate('medium');
            onDelete();
          } else if (deltaX > 0 && onCopy) {
            // Swipe right to copy
            vibrate('success');
            onCopy();
          }
        }

        // Reset swipe offset
        setSwipeOffset(0);
        setTimeout(() => setShowSwipeActions(false), 2000);
      },
    },
    {
      swipeThreshold: 60,
      longPressDelay: 500,
      dragThreshold: 10,
    }
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} relative`}
    >
      {/* Swipe Action Hints (Mobile only) */}
      {showSwipeActions && (
        <div className="absolute inset-0 flex items-center justify-between px-4 md:hidden">
          {onCopy && (
            <div className="flex items-center gap-2 text-success">
              <span>📋</span>
              <span className="text-xs">Copy</span>
            </div>
          )}
          {isUser && onDelete && (
            <div className="ml-auto flex items-center gap-2 text-danger">
              <span className="text-xs">Delete</span>
              <span>🗑️</span>
            </div>
          )}
        </div>
      )}

      <motion.div
        ref={gestureRef as React.RefObject<HTMLDivElement>}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`${bubbleWidthClass} ${bubblePaddingClass} rounded-2xl border ${roleStyles[message.role]} backdrop-blur-sm cursor-grab active:cursor-grabbing transition-shadow duration-200 hover:shadow-sm active:shadow-md`}
      >
        {/* Message Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Role Icon */}
            <span className="text-base">
              {isUser && '👤'}
              {isAssistant && '🤖'}
              {isSystem && '⚙️'}
            </span>

            {/* Role Label */}
            <span className="text-xs font-medium opacity-70">
              {isUser && t('user')}
              {isAssistant && t('assistant')}
              {isSystem && t('system')}
            </span>

            {/* Voice Indicator */}
            {isVoiceMessage && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent">
                🎤 {t('voice')}
              </span>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-xs opacity-50">{timeAgo}</span>
        </div>

        {/* Message Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmitEdit}
                className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
              >
                {t('save')}
              </button>
              <button
                onClick={onCancelEdit}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface/80 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <MessageContent
            content={message.content}
            role={message.role === 'system' ? 'assistant' : message.role}
            fileUrls={message.fileUrls}
          />
        )}

        {/* Tool Calls */}
        {hasToolCalls && (
          <div className="mt-3">
            <button
              onClick={() => setShowToolCalls(!showToolCalls)}
              className="flex items-center gap-2 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              <span>{showToolCalls ? '▼' : '▶'}</span>
              <span>🔧 {t('toolCalls')} ({toolCalls.length})</span>
            </button>
            <AnimatePresence>
              {showToolCalls && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 space-y-2 overflow-hidden"
                >
                  {toolCalls.map((call, index) => (
                    <ToolCallCard key={index} toolCall={call} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Thinking Process */}
        {hasThinking && (
          <div className="mt-3">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              <span>{showThinking ? '▼' : '▶'}</span>
              <span>🧠 {t('thinking')}</span>
            </button>
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 overflow-hidden rounded-lg border border-border bg-background/50 p-3"
                >
                  <div className="prose prose-sm prose-invert max-w-none">
                    <MessageContent content={thinkingProcess} role="assistant" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && !isEditing && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onCopy && (
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition hover:border-success hover:bg-success/20"
              >
                📋 {t('copy')}
              </button>
            )}
            {isAssistant && (
              <>
                {/* TTS Speak Button */}
                {(isSpeaking || isPaused) ? (
                  <div className="inline-flex items-center gap-1">
                    <motion.button
                      onClick={handleSpeak}
                      animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition ${
                        isSpeaking
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border bg-surface text-foreground hover:border-primary hover:bg-primary/10'
                      }`}
                    >
                      {isSpeaking ? '⏸️ Pause' : '▶️ Resume'}
                    </motion.button>
                    <button
                      onClick={handleStopSpeak}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition hover:border-danger hover:bg-danger/20"
                    >
                      ⏹️ Stop
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSpeak}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition hover:border-info hover:bg-info/20"
                  >
                    🔊 Speak
                  </button>
                )}
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition hover:border-primary hover:bg-primary/20"
                  >
                    🔄 {t('regenerate')}
                  </button>
                )}
              </>
            )}
            {isUser && onEdit && (
              <button
                onClick={() => onEdit(message.content)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition hover:border-primary hover:bg-primary/20"
              >
                ✏️ {t('edit')}
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition hover:border-danger hover:bg-danger/20"
              >
                🗑️ {t('delete')}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
});

// ============================================================================
// ToolCallCard Component
// ============================================================================

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const t = useTranslations('chat.messages');
  const [showDetails, setShowDetails] = useState(false);

  // Parse arguments from string to object
  const parsedArgs = useMemo(() => {
    try {
      return JSON.parse(toolCall.arguments);
    } catch {
      return {};
    }
  }, [toolCall.arguments]);

  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-accent">{toolCall.name}</span>
          {toolCall.status === 'error' && (
            <span className="text-xs text-danger">❌ {t('error')}</span>
          )}
        </div>
        <span className="text-xs text-foreground/50">
          {showDetails ? '▼' : '▶'}
        </span>
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {/* Arguments */}
            <div>
              <div className="text-xs font-medium text-foreground/70">{t('arguments')}</div>
              <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-xs text-foreground/80">
                {JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>

            {/* Result */}
            {toolCall.result && (
              <div>
                <div className="text-xs font-medium text-foreground/70">{t('result')}</div>
                <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-xs text-foreground/80">
                  {String(toolCall.result)}
                </pre>
              </div>
            )}

            {/* Error */}
            {toolCall.status === 'error' && (
              <div>
                <div className="text-xs font-medium text-danger">{t('error')}</div>
                <div className="mt-1 rounded bg-danger/10 p-2 text-xs text-danger">
                  Tool call failed
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

