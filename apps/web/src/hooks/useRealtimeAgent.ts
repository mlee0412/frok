import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@frok/ui';

interface WebRTCSession {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  ms: MediaStream;
}

export interface RealtimeAgentState {
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  error: string | null;
  audioLevel: number;
}

export interface UseRealtimeAgentReturn {
  state: RealtimeAgentState;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  toggleSession: () => Promise<void>;
  interrupt: () => void;
}

export function useRealtimeAgent(threadId?: string): UseRealtimeAgentReturn {
  const [state, setState] = useState<RealtimeAgentState>({
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    isListening: false,
    error: null,
    audioLevel: 0,
  });

  const sessionRef = useRef<WebRTCSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const toast = useToast();

  // Store actions for syncing
  // const addMessage = useUnifiedChatStore((state) => state.addMessage); // Unused for now

  // Initialize Audio Monitoring
  const initializeAudioMonitoring = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const level = Math.min(100, (average / 255) * 100);

      setState((prev) => ({ ...prev, audioLevel: Math.round(level) }));
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();
  }, []);

  const startSession = useCallback(async () => {
    if (state.isConnected || state.isConnecting) return;

    try {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      // 1. Get Ephemeral Token & Session ID from Backend
      const response = await fetch('/api/agent/realtime/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transport: 'webrtc',
          threadId, // Pass threadId for context sync
        }),
      });

      if (!response.ok) throw new Error('Failed to initialize session');
      const { data } = await response.json();
      const { clientSecret } = data; // Removed unused sessionId

      // 2. Initialize WebRTC Peer Connection
      const pc = new RTCPeerConnection();

      // Handle remote audio
      pc.ontrack = (event) => {
        const el = document.createElement('audio');
        el.srcObject = event.streams[0] || null; // Fix type mismatch
        el.autoplay = true;
        el.play();
      };

      // Get local microphone
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      ms.getTracks().forEach((track) => pc.addTrack(track, ms));
      initializeAudioMonitoring(ms);

      // 3. Set up Data Channel for Events
      const dc = pc.createDataChannel('oai-events');

      dc.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          isListening: true,
        }));
        toast.success('Voice session connected');
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);

          // Handle events for UI sync
          if (event.type === 'response.audio_transcript.delta') {
            // Realtime transcript updates could go here
          }

          if (event.type === 'response.done') {
            // Sync final response to chat
            // Note: We might rely on backend sync instead for reliability
            if (event.response?.output?.[0]?.content?.[0]?.transcript) {
              // Example: addMessage({ role: 'assistant', content: transcript });
              // But we need to be careful not to duplicate if backend syncs too.
              // For now, just logging or using addMessage if backend sync isn't implemented yet.
              // addMessage is currently unused, so we'll comment it out to satisfy lint,
              // or actually use it if we want client-side optimistic updates.
              // console.log('Response:', event.response.output[0].content[0].transcript);
            }
          }

          if (event.type === 'input_audio_buffer.speech_started') {
            setState((prev) => ({ ...prev, isSpeaking: false, isListening: true })); // User speaking
          }

          if (event.type === 'response.audio.started') {
            setState((prev) => ({ ...prev, isSpeaking: true, isListening: false })); // Agent speaking
          }
        } catch (err) {
          console.error('Error parsing event', err);
        }
      };

      // 4. Offer / Answer Exchange with OpenAI
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-5.1-realtime-preview'; // Or gpt-5.1-chat-latest if supported

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
      });

      const answer = {
        type: 'answer' as RTCSdpType, // Fix typo
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);

      // Store cleanup
      sessionRef.current = { pc, dc, ms };
    } catch (error: unknown) {
      console.error('Failed to start realtime session:', error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
      toast.error('Failed to start voice session');
    }
  }, [state.isConnected, state.isConnecting, threadId, initializeAudioMonitoring, toast]);

  const endSession = useCallback(async () => {
    const session = sessionRef.current;
    if (session) {
      session.pc.close();
      session.ms.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      sessionRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setState({
      isConnected: false,
      isConnecting: false,
      isSpeaking: false,
      isListening: false,
      error: null,
      audioLevel: 0,
    });
  }, []);

  const toggleSession = useCallback(async () => {
    if (state.isConnected) {
      await endSession();
    } else {
      await startSession();
    }
  }, [state.isConnected, startSession, endSession]);

  const interrupt = useCallback(() => {
    // Send interrupt event via data channel if needed
    // For WebRTC, stopping audio track or sending 'response.cancel' event works
    const session = sessionRef.current;
    if (session?.dc?.readyState === 'open') {
      session.dc.send(JSON.stringify({ type: 'response.cancel' }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  return {
    state,
    startSession,
    endSession,
    toggleSession,
    interrupt,
  };
}
