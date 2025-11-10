/**
 * Voice Agent Hook for Frontend Integration
 *
 * React hook for managing voice agent sessions and WebRTC connections.
 * Provides high-level API for hands-free voice interactions.
 *
 * Features:
 * - Voice session lifecycle management
 * - Microphone access and audio recording
 * - Real-time audio streaming to backend
 * - Voice activity detection feedback
 * - Error handling and recovery
 *
 * @module useVoiceAgent
 * @see apps/web/src/lib/agent/voiceAgent.ts
 * @see apps/web/src/app/api/agent/voice/start/route.ts
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { VoiceAgentConfig } from '@/lib/agent/voiceAgent';

/**
 * Voice agent state
 */
interface VoiceAgentState {
  sessionId: string | null;
  isListening: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  error: string | null;
  audioLevel: number; // 0-100, for visualizing microphone input
}

/**
 * Voice agent hook return type
 */
interface UseVoiceAgentReturn {
  state: VoiceAgentState;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  toggleListening: () => Promise<void>;
  setVoice: (voice: VoiceAgentConfig['ttsVoice']) => Promise<void>;
  getSupportedVoices: () => Array<{ id: string; name: string; description: string }>;
}

/**
 * Hook for managing voice agent interactions
 *
 * @param config - Voice agent configuration
 * @returns Voice agent controls and state
 *
 * @example
 * ```typescript
 * function VoiceChat() {
 *   const { state, startListening, stopListening, setVoice } = useVoiceAgent({
 *     ttsVoice: 'alloy',
 *     sttEnabled: true,
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={startListening} disabled={state.isListening}>
 *         🎤 Start
 *       </button>
 *       <button onClick={stopListening} disabled={!state.isListening}>
 *         Stop
 *       </button>
 *       {state.error && <div>Error: {state.error}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoiceAgent(
  config?: Partial<VoiceAgentConfig>
): UseVoiceAgentReturn {
  const [state, setState] = useState<VoiceAgentState>({
    sessionId: null,
    isListening: false,
    isSpeaking: false,
    isConnecting: false,
    error: null,
    audioLevel: 0,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Request microphone access
   */
  const requestMicrophoneAccess = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      return stream;
    } catch (err) {
      const error = err as Error;
      throw new Error(`Microphone access denied: ${error.message}`);
    }
  }, []);

  /**
   * Initialize audio level monitoring
   */
  const initializeAudioMonitoring = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    // Start monitoring audio levels
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const level = Math.min(100, (average / 255) * 100);

      setState((prev) => ({ ...prev, audioLevel: Math.round(level) }));

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();
  }, []);

  /**
   * Start voice agent session
   */
  const startListening = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      // Request microphone access
      const stream = await requestMicrophoneAccess();
      mediaStreamRef.current = stream;

      // Initialize audio monitoring
      initializeAudioMonitoring(stream);

      // Start voice agent session on backend
      const response = await fetch('/api/agent/voice/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            ttsVoice: config?.ttsVoice ?? 'alloy',
            sttEnabled: config?.sttEnabled ?? true,
            vadEnabled: config?.vadEnabled ?? true,
            language: config?.language ?? 'en',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start voice session');
      }

      const { sessionId } = await response.json();

      setState((prev) => ({
        ...prev,
        sessionId,
        isListening: true,
        isConnecting: false,
      }));

      console.log('[useVoiceAgent] Session started:', sessionId);
    } catch (err) {
      const error = err as Error;
      console.error('[useVoiceAgent] Start error:', error);

      // Clean up on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.message,
      }));
    }
  }, [config, requestMicrophoneAccess, initializeAudioMonitoring]);

  /**
   * Stop voice agent session
   */
  const stopListening = useCallback(async () => {
    try {
      // Stop microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      // Stop audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop audio monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Stop backend session
      if (state.sessionId) {
        await fetch('/api/agent/voice/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: state.sessionId }),
        });
      }

      setState({
        sessionId: null,
        isListening: false,
        isSpeaking: false,
        isConnecting: false,
        error: null,
        audioLevel: 0,
      });

      console.log('[useVoiceAgent] Session stopped');
    } catch (err) {
      const error = err as Error;
      console.error('[useVoiceAgent] Stop error:', error);

      setState((prev) => ({
        ...prev,
        error: error.message,
      }));
    }
  }, [state.sessionId]);

  /**
   * Toggle listening on/off
   */
  const toggleListening = useCallback(async () => {
    if (state.isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  /**
   * Change TTS voice mid-session
   */
  const setVoice = useCallback(
    async (voice: VoiceAgentConfig['ttsVoice']) => {
      if (!state.sessionId) {
        throw new Error('No active voice session');
      }

      await fetch('/api/agent/voice/set-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: state.sessionId, voice }),
      });

      console.log('[useVoiceAgent] Voice updated to:', voice);
    },
    [state.sessionId]
  );

  /**
   * Get supported TTS voices
   */
  const getSupportedVoices = useCallback(() => {
    return [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
      { id: 'echo', name: 'Echo', description: 'Clear, professional voice' },
      { id: 'fable', name: 'Fable', description: 'Warm, expressive voice' },
      { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
      { id: 'nova', name: 'Nova', description: 'Energetic, friendly voice' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft, calming voice' },
    ];
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (state.isListening) {
        stopListening();
      }
    };
  }, [state.isListening, stopListening]);

  return {
    state,
    startListening,
    stopListening,
    toggleListening,
    setVoice,
    getSupportedVoices,
  };
}
