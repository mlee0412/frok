'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@frok/ui';
import {
  useUnifiedChatStore,
  useVoiceState,
  useActiveThread,
  useVoiceSettings,
  type Thread,
} from '@/store/unifiedChatStore';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { VoiceVisualizer } from './VoiceVisualizer';
import { TranscriptDisplay } from './TranscriptDisplay';
import { WebSocketManager } from '@/lib/voice/websocketManager';
import { AudioStreamer, base64ToUint8Array } from './AudioStreamer';
import { VoiceActivityDetector } from './VoiceActivityDetector';
import type { VoiceMessage } from '@/types/voice';
import type { ChatThreadRow } from '@/types/database';

const mapThreadRowToThread = (row: ChatThreadRow): Thread => ({
  id: row.id,
  title: row.title || 'New Chat',
  agentId: row.agent_id || 'default',
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  lastMessageAt: row.last_message_at ? new Date(row.last_message_at).getTime() : undefined,
  archived: row.archived || false,
  pinned: row.pinned || false,
  folder: row.folder || undefined,
  tags: row.tags || undefined,
  messageCount: row.message_count || 0,
  metadata: {
    toolsEnabled: row.tools_enabled ?? true,
    enabledTools: row.enabled_tools || [],
    model: row.model || undefined,
    agentStyle: row.agent_style || undefined,
    projectContext: row.project_context || undefined,
    ...(row.metadata || {}),
  },
});

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
  const { vadSensitivity } = useVoiceSettings();
  const toggleVoiceSheet = useUnifiedChatStore((state) => state.toggleVoiceSheet);
  const finalizeVoiceMessage = useUnifiedChatStore((state) => state.finalizeVoiceMessage);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureServerThread = useCallback(async (): Promise<string> => {
    const currentThread = activeThread;
    if (currentThread && currentThread.id.startsWith('thread_')) {
      return currentThread.id;
    }

    const response = await fetch('/api/chat/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: currentThread?.title || 'Voice Chat',
        agentId: currentThread?.agentId || 'voice',
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok || !json.thread) {
      throw new Error(json.error || 'Failed to create chat thread');
    }

    const serverThread = mapThreadRowToThread(json.thread as ChatThreadRow);

    useUnifiedChatStore.setState((state) => {
      const messages = { ...state.messages };
      const drafts = { ...state.draftMessage };

      if (currentThread) {
        const existingMessages = state.messages[currentThread.id] || [];
        messages[serverThread.id] = existingMessages.map((msg) => ({
          ...msg,
          threadId: serverThread.id,
        }));
        delete messages[currentThread.id];

        const migratedDraft = drafts[currentThread.id];
        if (typeof migratedDraft === 'string') {
          drafts[serverThread.id] = migratedDraft;
          delete drafts[currentThread.id];
        }
      } else if (!messages[serverThread.id]) {
        messages[serverThread.id] = [];
      }

      const filteredThreads = state.threads.filter(
        (thread) => thread.id !== serverThread.id && thread.id !== currentThread?.id
      );

      return {
        threads: [serverThread, ...filteredThreads],
        activeThreadId: serverThread.id,
        messages,
        draftMessage: drafts,
      };
    });

    return serverThread.id;
  }, [activeThread]);

  const stopListening = () => {
    const store = useUnifiedChatStore.getState();
    store.setVoiceMode('idle');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    vadRef.current?.destroy();
    vadRef.current = null;

    wsManagerRef.current?.send({ type: 'end_utterance' });
  };

  const handleInterrupt = () => {
    console.log('[VoiceInterface] Interrupting assistant playback');
    wsManagerRef.current?.send({ type: 'interrupt' });
    audioStreamerRef.current?.stop();
    const store = useUnifiedChatStore.getState();
    store.clearVoiceResponse();
    store.setVoiceMode('idle');
  };

  const startAudioCapture = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            wsManagerRef.current?.send({
              type: 'audio_input',
              data: base64,
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(300);
    } catch (err) {
      console.error('[VoiceInterface] MediaRecorder error:', err);
      setError('Failed to start recording');
      const store = useUnifiedChatStore.getState();
      store.setVoiceMode('error');
    }
  };

  const startListening = async () => {
    try {
      if (!wsManagerRef.current) {
        throw new Error('Voice connection unavailable');
      }

      setError(null);
      await wsManagerRef.current.connect();

      const threadId = await ensureServerThread();

      const store = useUnifiedChatStore.getState();
      store.clearVoiceTranscript();
      store.clearVoiceResponse();
      store.setVoiceMode('listening');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);

      vadRef.current = new VoiceActivityDetector(audioContext, {
        threshold: vadSensitivity,
        onSpeechStart: () => {
          if (useUnifiedChatStore.getState().voiceMode === 'speaking') {
            handleInterrupt();
          }
        },
      });

      source.connect(vadRef.current.analyser);

      startAudioCapture(stream);

      wsManagerRef.current.send({
        type: 'start',
        threadId,
      });
    } catch (err) {
      console.error('[VoiceInterface] Microphone error:', err);
      setError('Failed to access microphone');
      const store = useUnifiedChatStore.getState();
      store.setVoiceMode('error');
    }
  };

  const cleanup = () => {
    stopListening();
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      wsManagerRef.current = null;
    }
    if (audioStreamerRef.current) {
      audioStreamerRef.current.destroy();
      audioStreamerRef.current = null;
    }
  };

  // Initialize WebSocket + audio streaming
  useEffect(() => {
    const handleMessage = (message: VoiceMessage) => {
      const store = useUnifiedChatStore.getState();

      switch (message.type) {
        case 'stt_result':
          store.setVoiceTranscript(message.text);
          store.setVoiceMode('processing');
          break;
        case 'llm_token':
          store.appendVoiceResponse(message.token);
          break;
        case 'audio_chunk':
          store.setVoiceMode('speaking');
          audioStreamerRef.current?.appendAudio(base64ToUint8Array(message.data));
          break;
        case 'response_complete': {
          if (store.activeThreadId) {
            store.finalizeVoiceMessage(store.activeThreadId);
          }
          store.setVoiceMode('idle');
          break;
        }
        case 'error':
          console.error('[VoiceInterface] Server error:', message.error);
          setError(message.error);
          store.setVoiceMode('error');
          break;
      }
    };

    const manager = new WebSocketManager({
      url: '/api/voice/stream',
      onMessage: handleMessage,
      onOpen: () => {
        console.log('[VoiceInterface] WebSocket connected');
        useUnifiedChatStore.getState().setVoiceConnected(true);
        setError(null);
      },
      onClose: () => {
        console.log('[VoiceInterface] WebSocket disconnected');
        useUnifiedChatStore.getState().setVoiceConnected(false);
      },
      onError: (socketError) => {
        console.error('[VoiceInterface] WebSocket error:', socketError);
        useUnifiedChatStore.getState().setVoiceConnected(false);
        useUnifiedChatStore.getState().setVoiceMode('error');
        setError('Connection error');
      },
    });

    wsManagerRef.current = manager;

    audioStreamerRef.current = new AudioStreamer({
      mimeType: 'audio/mpeg',
      onPlaybackStart: () => useUnifiedChatStore.getState().setVoiceMode('speaking'),
      onPlaybackEnd: () => useUnifiedChatStore.getState().setVoiceMode('idle'),
      onError: (err) => {
        console.error('[VoiceInterface] Audio playback error:', err);
        setError('Audio playback failed');
      },
    });

    return () => {
      cleanup();
    };
  }, []);

  // Stop listening if sheet closes
  useEffect(() => {
    if (!isVoiceSheetOpen) {
      stopListening();
      setError(null);
    }
  }, [isVoiceSheetOpen]);

  // Update VAD threshold when sensitivity changes
  useEffect(() => {
    if (vadRef.current) {
      vadRef.current.setThreshold(vadSensitivity);
    }
  }, [vadSensitivity]);

  // Finalize and close
  function handleFinalize() {
    if (activeThread?.id && (transcript.trim() || response.trim())) {
      finalizeVoiceMessage(activeThread.id);
    }
    stopListening();
    toggleVoiceSheet();
  }

  // Start/Stop voice
  async function handleToggleVoice() {
    if (mode === 'idle' || mode === 'error') {
      await startListening();
    } else {
      stopListening();
    }
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
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl"
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
            className="md:hidden fixed inset-0 z-50 flex flex-col"
            style={{
              background: 'radial-gradient(circle at 50% 30%, oklch(60% 0.15 250 / 0.08) 0%, var(--background) 60%)',
            }}
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
              error={error}
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
            <div
              className="flex w-full max-w-4xl flex-col rounded-2xl border border-border shadow-2xl"
              style={{
                height: '80vh',
                background: 'radial-gradient(circle at 50% 30%, oklch(60% 0.15 250 / 0.08) 0%, oklch(from var(--background) l c h / 0.95) 60%)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
              }}
            >
              <VoiceInterfaceContent
                mode={mode}
                connected={connected}
                transcript={transcript}
                response={response}
                error={error}
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
  error: string | null;
  onClose: () => void;
  onToggleVoice: () => void;
  onFinalize: () => void;
}

function VoiceInterfaceContent({
  mode,
  connected,
  transcript,
  response,
  error,
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

      {error && (
        <div className="border-b border-border bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

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
          variant={mode === 'idle' || mode === 'error' ? 'primary' : 'outline'}
          size="lg"
          onClick={onToggleVoice}
          className="w-full text-base"
        >
          {(mode === 'idle' || mode === 'error') && (
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
