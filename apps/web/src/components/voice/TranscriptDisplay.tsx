'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/lib/i18n/I18nProvider';

// ============================================================================
// TranscriptDisplay Component
// ============================================================================

/**
 * TranscriptDisplay - Displays voice transcripts with auto-scroll
 *
 * Features:
 * - User messages: bg-primary/10 styling
 * - Assistant messages: bg-surface styling
 * - Auto-scroll to latest message
 * - Typing indicator for streaming responses
 * - Smooth entrance animations
 * - Empty state handling
 */

interface TranscriptDisplayProps {
  transcript: string;
  response: string;
  isStreaming?: boolean;
}

export function TranscriptDisplay({ transcript, response, isStreaming = false }: TranscriptDisplayProps) {
  const t = useTranslations('voice');
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [transcript, response]);

  // No messages yet
  if (!transcript.trim() && !response.trim()) {
    return null;
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <AnimatePresence mode="popLayout">
        {/* User Transcript */}
        {transcript.trim() && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex justify-end"
          >
            <div className="max-w-[85%] space-y-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  U
                </div>
                <span className="text-xs font-medium text-primary">{t('you')}</span>
              </div>
              <div className="text-sm leading-relaxed text-foreground">{transcript}</div>
            </div>
          </motion.div>
        )}

        {/* Assistant Response */}
        {response.trim() && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex justify-start"
            ref={lastMessageRef}
          >
            <div className="max-w-[85%] space-y-2 rounded-2xl border border-border bg-surface px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-xs font-semibold text-success">
                  A
                </div>
                <span className="text-xs font-medium text-success">{t('assistant')}</span>
                {isStreaming && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-success">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" style={{ animationDelay: '0.2s' }} />
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
              <div className="text-sm leading-relaxed text-foreground">
                {response}
                {isStreaming && (
                  <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-success" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
