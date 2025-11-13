'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@frok/ui';
import { useUnifiedChatStore, useVoiceState, useVoiceSettings, useActiveThread } from '@/store/unifiedChatStore';
import { useTranslations } from '@/lib/i18n/I18nProvider';

// ============================================================================
// VoiceSheet Component
// ============================================================================

/**
 * VoiceSheet - Voice assistant interface
 *
 * Desktop: Slides from right (320px wide)
 * Mobile: Slides from bottom (full width, 70vh high)
 *
 * Features:
 * - Real-time waveform visualization
 * - Voice state indicators (listening, processing, speaking)
 * - Transcript display
 * - Voice settings (voice ID, auto-start, VAD sensitivity)
 * - Finalize to save as message
 */
export function VoiceSheet() {
  // const t = useTranslations('voice'); // TODO: Add i18n support for voice sheet

  // Store state
  const { mode, connected, transcript, response } = useVoiceState();
  const { voiceId, autoStart, vadSensitivity } = useVoiceSettings();
  const activeThread = useActiveThread();
  const toggleVoiceSheet = useUnifiedChatStore((state) => state.toggleVoiceSheet);
  const setVoiceMode = useUnifiedChatStore((state) => state.setVoiceMode);
  const setVoiceConnected = useUnifiedChatStore((state) => state.setVoiceConnected);
  const finalizeVoiceMessage = useUnifiedChatStore((state) => state.finalizeVoiceMessage);
  const setVoiceId = useUnifiedChatStore((state) => state.setVoiceId);
  const setAutoStartVoice = useUnifiedChatStore((state) => state.setAutoStartVoice);
  const setVadSensitivity = useUnifiedChatStore((state) => state.setVadSensitivity);

  // Local state
  const [showSettings, setShowSettings] = useState(false);

  // Canvas for waveform
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start/Stop voice
  function handleToggleVoice() {
    if (mode === 'idle') {
      // TODO: Connect to voice WebSocket
      setVoiceConnected(true);
      setVoiceMode('listening');
    } else {
      // Stop and finalize
      if (activeThread?.id) {
        finalizeVoiceMessage(activeThread.id);
      }
      setVoiceMode('idle');
      setVoiceConnected(false);
    }
  }

  // Finalize and close
  function handleFinalize() {
    if (activeThread?.id) {
      finalizeVoiceMessage(activeThread.id);
    }
    toggleVoiceSheet();
  }

  // Draw waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    let animationId: number;

    function drawWaveform() {
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // Draw waveform bars
      const barCount = 40;
      const barWidth = width / barCount;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth;
        const amplitude = mode === 'listening' || mode === 'speaking'
          ? Math.sin(Date.now() / 200 + i) * (height / 4) + Math.random() * 10
          : 5;

        ctx.fillStyle =
          mode === 'listening'
            ? 'rgba(34, 211, 238, 0.6)' // Primary color (cyan)
            : mode === 'speaking'
            ? 'rgba(34, 197, 94, 0.6)' // Success color (green)
            : 'rgba(255, 255, 255, 0.2)'; // Idle (gray)

        ctx.fillRect(x, centerY - amplitude, barWidth - 2, amplitude * 2);
      }

      animationId = requestAnimationFrame(drawWaveform);
    }

    drawWaveform();

    return () => cancelAnimationFrame(animationId);
  }, [mode]);

  return (
    <>
      {/* Desktop: Slide from right */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className="hidden md:flex fixed right-0 top-0 bottom-0 z-40 w-80 flex-col border-l border-border bg-surface/95 backdrop-blur-md shadow-2xl"
      >
        <VoiceSheetContent
          mode={mode}
          connected={connected}
          transcript={transcript}
          response={response}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onClose={toggleVoiceSheet}
          onToggleVoice={handleToggleVoice}
          onFinalize={handleFinalize}
          canvasRef={canvasRef}
          // Settings
          voiceId={voiceId}
          autoStart={autoStart}
          vadSensitivity={vadSensitivity}
          onVoiceIdChange={setVoiceId}
          onAutoStartChange={setAutoStartVoice}
          onVadSensitivityChange={setVadSensitivity}
        />
      </motion.aside>

      {/* Mobile: Slide from bottom */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col rounded-t-2xl border-t border-border bg-surface/95 backdrop-blur-md shadow-2xl"
        style={{ height: '70vh' }}
      >
        <VoiceSheetContent
          mode={mode}
          connected={connected}
          transcript={transcript}
          response={response}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onClose={toggleVoiceSheet}
          onToggleVoice={handleToggleVoice}
          onFinalize={handleFinalize}
          canvasRef={canvasRef}
          // Settings
          voiceId={voiceId}
          autoStart={autoStart}
          vadSensitivity={vadSensitivity}
          onVoiceIdChange={setVoiceId}
          onAutoStartChange={setAutoStartVoice}
          onVadSensitivityChange={setVadSensitivity}
        />
      </motion.div>
    </>
  );
}

// ============================================================================
// VoiceSheetContent - Shared content for desktop and mobile
// ============================================================================

interface VoiceSheetContentProps {
  mode: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  connected: boolean;
  transcript: string;
  response: string;
  showSettings: boolean;
  onToggleSettings: () => void;
  onClose: () => void;
  onToggleVoice: () => void;
  onFinalize: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  // Settings
  voiceId: string | null;
  autoStart: boolean;
  vadSensitivity: number;
  onVoiceIdChange: (id: string) => void;
  onAutoStartChange: (value: boolean) => void;
  onVadSensitivityChange: (value: number) => void;
}

function VoiceSheetContent({
  mode,
  connected,
  transcript,
  response,
  showSettings,
  onToggleSettings,
  onClose,
  onToggleVoice,
  onFinalize,
  canvasRef,
  voiceId,
  autoStart,
  vadSensitivity,
  onVoiceIdChange,
  onAutoStartChange,
  onVadSensitivityChange,
}: VoiceSheetContentProps) {
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
          onClick={onToggleSettings}
          aria-label="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
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
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <VoiceSettings
              voiceId={voiceId}
              autoStart={autoStart}
              vadSensitivity={vadSensitivity}
              onVoiceIdChange={onVoiceIdChange}
              onAutoStartChange={onAutoStartChange}
              onVadSensitivityChange={onVadSensitivityChange}
            />
          ) : (
            <VoiceInterface
              mode={mode}
              transcript={transcript}
              response={response}
              canvasRef={canvasRef}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col gap-2 border-t border-border p-4">
        {/* Voice Toggle Button */}
        <Button
          variant={mode === 'idle' ? 'primary' : 'outline'}
          size="lg"
          onClick={onToggleVoice}
          className="w-full"
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
            {t('finalize')} →
          </Button>
        )}
      </div>
    </>
  );
}

// ============================================================================
// VoiceInterface - Waveform and transcripts
// ============================================================================

interface VoiceInterfaceProps {
  mode: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  transcript: string;
  response: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

function VoiceInterface({ mode, transcript, response, canvasRef }: VoiceInterfaceProps) {
  const t = useTranslations('voice');

  return (
    <motion.div
      key="interface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Waveform Visualization */}
      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={120}
          className="rounded-lg bg-surface/40"
        />
        <div className="text-sm font-medium text-foreground">
          {mode === 'idle' && t('idle')}
          {mode === 'listening' && t('listening')}
          {mode === 'processing' && t('processing')}
          {mode === 'speaking' && t('speaking')}
          {mode === 'error' && t('error')}
        </div>
      </div>

      {/* Transcript (User) */}
      {transcript.trim() && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
          <div className="mb-1 text-xs font-medium text-primary">{t('you')}</div>
          <div className="text-sm text-foreground">{transcript}</div>
        </div>
      )}

      {/* Response (Assistant) */}
      {response.trim() && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3">
          <div className="mb-1 text-xs font-medium text-success">{t('assistant')}</div>
          <div className="text-sm text-foreground">{response}</div>
        </div>
      )}

      {/* Empty State */}
      {!transcript.trim() && !response.trim() && mode === 'idle' && (
        <div className="py-8 text-center text-sm text-foreground/60">
          {t('emptyState')}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// VoiceSettings - Configuration panel
// ============================================================================

interface VoiceSettingsProps {
  voiceId: string | null;
  autoStart: boolean;
  vadSensitivity: number;
  onVoiceIdChange: (id: string) => void;
  onAutoStartChange: (value: boolean) => void;
  onVadSensitivityChange: (value: number) => void;
}

function VoiceSettings({
  voiceId,
  autoStart,
  vadSensitivity,
  onVoiceIdChange,
  onAutoStartChange,
  onVadSensitivityChange,
}: VoiceSettingsProps) {
  const t = useTranslations('voice.settings');

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Voice ID */}
      <div className="space-y-2">
        <label htmlFor="voice-id" className="text-sm font-medium text-foreground">
          {t('voiceId')}
        </label>
        <input
          id="voice-id"
          type="text"
          value={voiceId || ''}
          onChange={(e) => onVoiceIdChange(e.target.value)}
          placeholder="Enter ElevenLabs voice ID"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Auto Start */}
      <div className="flex items-center justify-between">
        <label htmlFor="auto-start" className="text-sm font-medium text-foreground">
          {t('autoStart')}
        </label>
        <input
          id="auto-start"
          type="checkbox"
          checked={autoStart}
          onChange={(e) => onAutoStartChange(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* VAD Sensitivity */}
      <div className="space-y-2">
        <label htmlFor="vad-sensitivity" className="text-sm font-medium text-foreground">
          {t('vadSensitivity')} ({vadSensitivity.toFixed(3)})
        </label>
        <input
          id="vad-sensitivity"
          type="range"
          min="0.001"
          max="0.1"
          step="0.001"
          value={vadSensitivity}
          onChange={(e) => onVadSensitivityChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-foreground/60">
          <span>{t('lessSensitive')}</span>
          <span>{t('moreSensitive')}</span>
        </div>
      </div>
    </motion.div>
  );
}
