import { useState, useCallback, useRef, useEffect } from 'react';

export type TTSState = 'idle' | 'speaking' | 'paused';

export type TTSSettings = {
  rate: number; // 0.5 to 2.0
  voice: string | null; // voice name
};

export function useTextToSpeech() {
  const [ttsState, setTtsState] = useState<TTSState>('idle');
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<TTSSettings>({
    rate: 1.0,
    voice: null,
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Auto-select a good default voice if not set
      if (!settings.voice && availableVoices.length > 0) {
        const preferredVoice = availableVoices.find(
          (voice) =>
            voice.lang.startsWith('en') &&
            (voice.name.includes('Google') ||
              voice.name.includes('Natural') ||
              voice.name.includes('Enhanced'))
        ) || availableVoices.find((voice) => voice.lang.startsWith('en'));
        
        if (preferredVoice) {
          setSettings(prev => ({ ...prev, voice: preferredVoice.name }));
        }
      }
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      if (utteranceRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string, messageId: string) => {
    // Stop any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure voice settings
    utterance.rate = settings.rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Set selected voice
    if (settings.voice) {
      const selectedVoice = voices.find((v) => v.name === settings.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => {
      setTtsState('speaking');
      setCurrentMessageId(messageId);
    };

    utterance.onend = () => {
      setTtsState('idle');
      setCurrentMessageId(null);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('TTS error:', event);
      setTtsState('idle');
      setCurrentMessageId(null);
      utteranceRef.current = null;
    };

    speechSynthesis.speak(utterance);
  }, [settings, voices]);

  const pause = useCallback(() => {
    if (ttsState === 'speaking') {
      speechSynthesis.pause();
      setTtsState('paused');
    }
  }, [ttsState]);

  const resume = useCallback(() => {
    if (ttsState === 'paused') {
      speechSynthesis.resume();
      setTtsState('speaking');
    }
  }, [ttsState]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setTtsState('idle');
    setCurrentMessageId(null);
    utteranceRef.current = null;
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    ttsState,
    currentMessageId,
    settings,
    voices,
    speak,
    pause,
    resume,
    stop,
    updateSettings,
  };
}
