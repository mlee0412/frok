import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VoiceState, VoiceMessageRecord } from '@/types/voice';

/**
 * Voice Assistant Store
 * Manages voice conversation state, messages, and settings
 *
 * State persisted to localStorage: voiceId, autoStart, vadSensitivity
 * Ephemeral state: current conversation, transcript, response
 */

// ============================================================================
// Store State Interface
// ============================================================================

interface VoiceStore {
  // ===== Conversation State =====
  state: VoiceState;
  transcript: string; // Current user utterance being transcribed
  response: string; // Current assistant response being streamed
  messages: VoiceMessageRecord[];
  isConnected: boolean; // WebSocket connection status

  // ===== Settings (Persisted) =====
  voiceId: string | null; // ElevenLabs voice ID
  autoStart: boolean; // Auto-start listening on page load
  vadSensitivity: number; // VAD threshold (0.01 = default)

  // ===== Actions =====
  // State management
  setState: (state: VoiceState) => void;
  setConnected: (connected: boolean) => void;

  // Transcript management
  setTranscript: (text: string) => void;
  clearTranscript: () => void;

  // Response management
  appendResponse: (token: string) => void;
  clearResponse: () => void;

  // Message management
  addMessage: (message: VoiceMessageRecord) => void;
  clearMessages: () => void;

  // Settings management
  setVoiceId: (voiceId: string) => void;
  setAutoStart: (autoStart: boolean) => void;
  setVadSensitivity: (sensitivity: number) => void;

  // Utility
  reset: () => void; // Reset all state (except settings)
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  // Conversation state (ephemeral)
  state: 'idle' as VoiceState,
  transcript: '',
  response: '',
  messages: [] as VoiceMessageRecord[],
  isConnected: false,

  // Settings (persisted)
  voiceId: null as string | null,
  autoStart: false,
  vadSensitivity: 0.01, // Default RMS threshold
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set) => ({
      ...initialState,

      // ===== State Management =====

      setState: (state) => {
        set({ state });
      },

      setConnected: (connected) => {
        set({ isConnected: connected });
      },

      // ===== Transcript Management =====

      setTranscript: (text) => {
        set({ transcript: text });
      },

      clearTranscript: () => {
        set({ transcript: '' });
      },

      // ===== Response Management =====

      appendResponse: (token) => {
        set((state) => ({
          response: state.response + token,
        }));
      },

      clearResponse: () => {
        set({ response: '' });
      },

      // ===== Message Management =====

      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      clearMessages: () => {
        set({
          messages: [],
          transcript: '',
          response: '',
        });
      },

      // ===== Settings Management =====

      setVoiceId: (voiceId) => {
        set({ voiceId });
      },

      setAutoStart: (autoStart) => {
        set({ autoStart });
      },

      setVadSensitivity: (sensitivity) => {
        // Clamp between 0.001 and 0.1
        const clamped = Math.max(0.001, Math.min(0.1, sensitivity));
        set({ vadSensitivity: clamped });
      },

      // ===== Utility =====

      reset: () => {
        set({
          state: 'idle',
          transcript: '',
          response: '',
          messages: [],
          isConnected: false,
          // Keep settings (voiceId, autoStart, vadSensitivity)
        });
      },
    }),
    {
      name: 'voice-store',
      // Only persist settings, not conversation state
      partialize: (state) => ({
        voiceId: state.voiceId,
        autoStart: state.autoStart,
        vadSensitivity: state.vadSensitivity,
      }),
    }
  )
);

// ============================================================================
// Selector Hooks (Optional: For Performance Optimization)
// ============================================================================

/**
 * Select only the current voice state
 */
export const useVoiceState = () => useVoiceStore((state) => state.state);

/**
 * Select only messages
 */
export const useVoiceMessages = () => useVoiceStore((state) => state.messages);

/**
 * Select only settings
 */
export const useVoiceSettings = () =>
  useVoiceStore((state) => ({
    voiceId: state.voiceId,
    autoStart: state.autoStart,
    vadSensitivity: state.vadSensitivity,
  }));

/**
 * Select only connection status
 */
export const useVoiceConnection = () => useVoiceStore((state) => state.isConnected);
