'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/lib/i18n/I18nProvider';

// ============================================================================
// VoiceInput Component
// ============================================================================

/**
 * VoiceInput - Browser Speech Recognition integration
 *
 * Features:
 * - Web Speech API (browser-based, no server required)
 * - Real-time transcription display
 * - Visual feedback (pulsing mic, waveform animation)
 * - Language selection (en-US, ko-KR)
 * - Interim vs final results
 * - Auto-punctuation (browser-dependent)
 * - Error handling with fallback messages
 * - Continuous listening mode
 * - Manual stop with timeout
 */

export interface VoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxDuration?: number; // seconds
}

export function VoiceInput({
  onTranscript,
  onError,
  onStart,
  onEnd,
  language = 'en-US',
  continuous = true,
  interimResults = true,
  maxDuration = 60,
}: VoiceInputProps) {
  const t = useTranslations('chat.voice');

  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser');
      return;
    }

    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setElapsedTime(0);
      onStart?.();

      // Start elapsed time timer
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      // Auto-stop after maxDuration
      if (maxDuration > 0) {
        timeoutRef.current = setTimeout(() => {
          stopListening();
        }, maxDuration * 1000);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result?.[0];
        if (!alternative) continue;

        const text = alternative.transcript;

        if (result.isFinal) {
          finalText += text + ' ';
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
        setInterimTranscript('');
        onTranscript(finalText.trim(), true);
      } else if (interimText) {
        setInterimTranscript(interimText);
        onTranscript(interimText, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      onError?.(errorMessage);
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      onEnd?.();
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, interimResults, maxDuration, onTranscript, onError, onStart, onEnd]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start voice recognition');
      onError?.('Failed to start voice recognition');
    }
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error('Failed to stop recognition:', err);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-center">
        <div className="mb-2 text-2xl">⚠️</div>
        <div className="text-sm text-warning">
          {t('unsupported')}
        </div>
        <div className="mt-2 text-xs text-foreground/60">
          Try Chrome, Edge, or Safari
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Voice Control Button */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={toggleListening}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all ${
            isListening
              ? 'bg-danger shadow-lg shadow-danger/50'
              : 'bg-primary hover:bg-primary/90 shadow-md'
          }`}
        >
          {/* Pulsing animation when listening */}
          {isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-danger/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-danger/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            </>
          )}

          {/* Mic Icon */}
          <div className="relative z-10 text-4xl">
            {isListening ? '⏹️' : '🎤'}
          </div>
        </button>
      </div>

      {/* Status and Timer */}
      <div className="text-center">
        <div className="text-sm font-medium text-foreground">
          {isListening ? t('listening') : t('tapToStart')}
        </div>
        {isListening && (
          <div className="mt-1 text-xs text-foreground/60">
            {formatTime(elapsedTime)} / {formatTime(maxDuration)}
          </div>
        )}
      </div>

      {/* Transcript Display */}
      <AnimatePresence mode="wait">
        {(transcript || interimTranscript) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/70">
                {t('transcript')}
              </span>
              {transcript && (
                <button
                  onClick={clearTranscript}
                  className="text-xs text-foreground/50 hover:text-foreground transition-colors"
                >
                  {t('clear')}
                </button>
              )}
            </div>
            <div className="text-sm text-foreground">
              {transcript}
              {interimTranscript && (
                <span className="text-foreground/50 italic">{interimTranscript}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-center"
          >
            <div className="text-sm text-danger">{error}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Waveform (when listening) */}
      {isListening && (
        <div className="flex items-center justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="h-8 w-2 rounded-full bg-primary"
              animate={{
                scaleY: [1, 2, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech detected. Please try again.';
    case 'audio-capture':
      return 'No microphone found. Please connect a microphone.';
    case 'not-allowed':
      return 'Microphone permission denied. Please enable microphone access.';
    case 'network':
      return 'Network error. Please check your connection.';
    case 'aborted':
      return 'Recognition aborted.';
    case 'service-not-allowed':
      return 'Speech recognition service not allowed.';
    default:
      return `Speech recognition error: ${error}`;
  }
}

// ============================================================================
// Type Declarations
// ============================================================================

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};
