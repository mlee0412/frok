'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@frok/ui';
import { useUnifiedChatStore, useVoiceState, useActiveThread } from '@/store/unifiedChatStore';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { VoiceVisualizer } from './VoiceVisualizer';
import { TranscriptDisplay } from './TranscriptDisplay';

// ============================================================================
// VoiceInterface Component
// ============================================================================

/**
 * VoiceInterface - Fullscreen voice assistant interface
 *
 * Mobile: Fullscreen takeover with swipe-down-to-dismiss
 * Desktop: Modal overlay (80% width, centered) with ESC key dismiss
 *
 * Features:
 * - Real-time audio waveform visualization
 * - Transcript display with auto-scroll
 * - Voice controls (start, stop, finalize)
 * - Swipe gestures (mobile only)
 * - Keyboard shortcuts (ESC to close)
 */
export function VoiceInterface() {
  // Store state
  const isVoiceSheetOpen = useUnifiedChatStore((state) => state.isVoiceSheetOpen);
  const { mode, connected, transcript, response } = useVoiceState();
  const activeThread = useActiveThread();
  const toggleVoiceSheet = useUnifiedChatStore((state) => state.toggleVoiceSheet);
  const setVoiceMode = useUnifiedChatStore((state) => state.setVoiceMode);
  const setVoiceConnected = useUnifiedChatStore((state) => state.setVoiceConnected);
  const finalizeVoiceMessage = useUnifiedChatStore((state) => state.finalizeVoiceMessage);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Start/Stop voice
  function handleToggleVoice() {
    if (mode === 'idle') {
      // TODO: Connect to voice WebSocket
      setVoiceConnected(true);
      setVoiceMode('listening');
    } else {
      // Stop
      setVoiceMode('idle');
      setVoiceConnected(false);
    }
  }

  // Finalize and close
  function handleFinalize() {
    if (activeThread?.id && (transcript.trim() || response.trim())) {
      finalizeVoiceMessage(activeThread.id);
    }
    toggleVoiceSheet();
  }

  // ESC key to close (desktop)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isVoiceSheetOpen) {
        toggleVoiceSheet();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVoiceSheetOpen, toggleVoiceSheet]);

  // Swipe down to dismiss (mobile)
  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 100) {
      // Swipe down threshold: 100px
      toggleVoiceSheet();
    }
  }

  return (
    <AnimatePresence>
      {isVoiceSheetOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleVoiceSheet}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Mobile: Fullscreen */}
          <motion.div
            ref={containerRef}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="md:hidden fixed inset-0 z-50 flex flex-col bg-background"
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-12 rounded-full bg-foreground/20" />
            </div>

            {/* Content */}
            <VoiceInterfaceContent
              mode={mode}
              connected={connected}
              transcript={transcript}
              response={response}
              onClose={toggleVoiceSheet}
              onToggleVoice={handleToggleVoice}
              onFinalize={handleFinalize}
            />
          </motion.div>

          {/* Desktop: Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4"
          >
            <div className="flex w-full max-w-4xl flex-col rounded-2xl border border-border bg-surface shadow-2xl" style={{ height: '80vh' }}>
              <VoiceInterfaceContent
                mode={mode}
                connected={connected}
                transcript={transcript}
                response={response}
                onClose={toggleVoiceSheet}
                onToggleVoice={handleToggleVoice}
                onFinalize={handleFinalize}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// VoiceInterfaceContent - Shared content for mobile and desktop
// ============================================================================

interface VoiceInterfaceContentProps {
  mode: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  connected: boolean;
  transcript: string;
  response: string;
  onClose: () => void;
  onToggleVoice: () => void;
  onFinalize: () => void;
}

function VoiceInterfaceContent({
  mode,
  connected,
  transcript,
  response,
  onClose,
  onToggleVoice,
  onFinalize,
}: VoiceInterfaceContentProps) {
  const t = useTranslations('voice');

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
          <p className="text-xs text-foreground/60">
            {connected ? t('connected') : t('disconnected')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Waveform Visualization */}
          <div className="flex flex-col items-center gap-4">
            <VoiceVisualizer mode={mode} />
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {mode === 'idle' && t('idle')}
                {mode === 'listening' && t('listening')}
                {mode === 'processing' && t('processing')}
                {mode === 'speaking' && t('speaking')}
                {mode === 'error' && t('error')}
              </div>
              <div className="text-sm text-foreground/60">
                {mode === 'idle' && t('idleDescription')}
                {mode === 'listening' && t('listeningDescription')}
                {mode === 'processing' && t('processingDescription')}
                {mode === 'speaking' && t('speakingDescription')}
              </div>
            </div>
          </div>

          {/* Transcript Display */}
          <TranscriptDisplay transcript={transcript} response={response} />

          {/* Empty State */}
          {!transcript.trim() && !response.trim() && mode === 'idle' && (
            <div className="py-12 text-center">
              <div className="mb-3 text-5xl">🎤</div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{t('emptyTitle')}</h3>
              <p className="text-sm text-foreground/60">{t('emptyDescription')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col gap-3 border-t border-border p-4">
        {/* Voice Toggle Button */}
        <Button
          variant={mode === 'idle' ? 'primary' : 'outline'}
          size="lg"
          onClick={onToggleVoice}
          className="w-full text-base"
        >
          {mode === 'idle' && (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              </svg>
              {t('start')}
            </>
          )}
          {mode === 'listening' && (
            <>
              <div className="mr-2 h-3 w-3 animate-pulse rounded-full bg-white" />
              {t('listening')}
            </>
          )}
          {mode === 'processing' && (
            <>
              <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t('processing')}
            </>
          )}
          {mode === 'speaking' && (
            <>
              <svg className="mr-2 h-5 w-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              {t('speaking')}
            </>
          )}
        </Button>

        {/* Finalize Button (if has content) */}
        {(transcript.trim() || response.trim()) && (
          <Button variant="ghost" size="sm" onClick={onFinalize} className="w-full">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('finalize')}
          </Button>
        )}
      </div>
    </>
  );
}
