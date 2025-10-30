import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export type TTSState = {
  enabled: boolean;
  autoPlay: boolean;
  voice: TTSVoice;
  speed: number; // 0.25 to 4.0
  volume: number; // 0.0 to 1.0
};

export type TTSActions = {
  setEnabled: (enabled: boolean) => void;
  setAutoPlay: (autoPlay: boolean) => void;
  setVoice: (voice: TTSVoice) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  reset: () => void;
};

export type TTSStore = TTSState & TTSActions;

// Initial state
const initialState: TTSState = {
  enabled: false,
  autoPlay: false,
  voice: 'alloy',
  speed: 1.0,
  volume: 0.8,
};

export const useTTSStore = create<TTSStore>()(
  persist(
    (set) => ({
      ...initialState,

      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },

      setAutoPlay: (autoPlay: boolean) => {
        set({ autoPlay });
      },

      setVoice: (voice: TTSVoice) => {
        set({ voice });
      },

      setSpeed: (speed: number) => {
        // Clamp speed between 0.25 and 4.0
        const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));
        set({ speed: clampedSpeed });
      },

      setVolume: (volume: number) => {
        // Clamp volume between 0 and 1
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ volume: clampedVolume });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'frok-tts-store',
      version: 1,
    }
  )
);
