/**
 * Voice Assistant - Main Container Component
 *
 * Real-time voice conversation interface with MediaSource audio playback.
 *
 * Features:
 * - Real-time audio capture and streaming
 * - Voice Activity Detection for barge-in
 * - MediaSource Extensions for low-latency playback
 * - WebSocket communication with backend
 * - Conversation transcript display
 *
 * Architecture:
 * - Browser: MediaRecorder → WebSocket → AudioStreamer
 * - Server: STT (Deepgram) → LLM (GPT-5) → TTS (ElevenLabs)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, VolumeX } from 'lucide-react';
import { Button, Card } from '@frok/ui';
import { useVoiceStore } from '@/store/voiceStore';
import { AudioStreamer, base64ToUint8Array } from './AudioStreamer';
import { VoiceActivityDetector } from './VoiceActivityDetector';
import { WebSocketManager } from '@/lib/voice/websocketManager';
import type { VoiceMessage } from '@/types/voice';

export function VoiceAssistant() {
  const {
    state,
    setState,
    transcript,
    response,
    messages,
    isConnected,
    setConnected,
    addMessage,
    appendResponse,
    clearResponse,
    setTranscript,
    vadSensitivity,
  } = useVoiceStore();

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    // Initialize WebSocket connection
    wsManagerRef.current = new WebSocketManager({
      url: '/api/voice/stream',
      onMessage: handleWebSocketMessage,
      onError: handleWebSocketError,
      onOpen: () => {
        console.log('[VoiceAssistant] WebSocket connected');
        setConnected(true);
        setError(null);
      },
      onClose: () => {
        console.log('[VoiceAssistant] WebSocket disconnected');
        setConnected(false);
      },
    });

    wsManagerRef.current.connect();

    // Initialize Audio Streamer for playback
    audioStreamerRef.current = new AudioStreamer({
      mimeType: 'audio/mpeg',
      onPlaybackStart: () => setState('speaking'),
      onPlaybackEnd: () => setState('idle'),
      onError: (err) => {
        console.error('[VoiceAssistant] Audio playback error:', err);
        setError('Audio playback failed');
      },
    });

    return () => {
      cleanup();
    };
  }, []);

  // ============================================================================
  // WebSocket Message Handling
  // ============================================================================

  const handleWebSocketMessage = (msg: VoiceMessage) => {
    switch (msg.type) {
      case 'stt_result':
        // Display user's transcribed speech
        setTranscript(msg.text);
        addMessage({
          role: 'user',
          content: msg.text,
          timestamp: Date.now(),
        });
        setState('processing');
        break;

      case 'llm_token':
        // Stream assistant response text
        appendResponse(msg.token);
        break;

      case 'audio_chunk':
        // Play audio chunk
        if (state !== 'speaking') setState('speaking');
        const audioData = base64ToUint8Array(msg.data);
        audioStreamerRef.current?.appendAudio(audioData);
        break;

      case 'response_complete':
        // Response finished, save to message history
        const currentResponse = useVoiceStore.getState().response;
        if (currentResponse.trim()) {
          addMessage({
            role: 'assistant',
            content: currentResponse,
            timestamp: Date.now(),
          });
        }
        clearResponse();
        setState('idle');
        break;

      case 'error':
        console.error('[VoiceAssistant] Server error:', msg.error);
        setError(msg.error);
        setState('error');
        break;
    }
  };

  const handleWebSocketError = (error: Event) => {
    console.error('[VoiceAssistant] WebSocket error:', error);
    setError('Connection error');
    setState('error');
  };

  // ============================================================================
  // Audio Recording
  // ============================================================================

  const startListening = async () => {
    try {
      setError(null);
      setState('listening');

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Initialize VAD for interruption detection
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);

      vadRef.current = new VoiceActivityDetector(audioContext, {
        threshold: vadSensitivity,
        onSpeechStart: () => {
          // If assistant is speaking, interrupt
          if (state === 'speaking') {
            handleInterrupt();
          }
        },
      });

      source.connect(vadRef.current.analyser);

      // Start capturing and sending audio
      startAudioCapture(stream);
    } catch (error) {
      console.error('[VoiceAssistant] Microphone error:', error);
      setError('Failed to access microphone');
      setState('error');
    }
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

      // Send audio chunks every 300ms
      mediaRecorder.start(300);
    } catch (error) {
      console.error('[VoiceAssistant] MediaRecorder error:', error);
      setError('Failed to start recording');
      setState('error');
    }
  };

  const stopListening = () => {
    setState('idle');

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Cleanup VAD
    vadRef.current?.destroy();
    vadRef.current = null;
  };

  const handleInterrupt = () => {
    console.log('[VoiceAssistant] Interrupting...');

    // Send interrupt signal to server
    wsManagerRef.current?.send({ type: 'interrupt' });

    // Stop audio playback immediately
    audioStreamerRef.current?.stop();

    // Clear response state
    clearResponse();
    setState('idle');
  };

  // ============================================================================
  // Cleanup
  // ============================================================================

  const cleanup = () => {
    stopListening();
    wsManagerRef.current?.disconnect();
    audioStreamerRef.current?.destroy();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with status */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected ? 'bg-success animate-pulse' : 'bg-danger'
              }`}
            />
            <span className="text-sm text-foreground/70">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="text-sm font-medium text-foreground">
            {state === 'listening' && '🎤 Listening...'}
            {state === 'processing' && '🤔 Thinking...'}
            {state === 'speaking' && '🗣️ Speaking...'}
            {state === 'idle' && '💤 Idle'}
            {state === 'error' && '⚠️ Error'}
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded bg-danger/10 p-2 text-sm text-danger">
            {error}
          </div>
        )}
      </div>

      {/* Conversation transcript */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <Card
              key={idx}
              className={`p-3 ${
                msg.role === 'user'
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-surface border-border'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs text-foreground/60">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground">{msg.content}</p>
            </Card>
          ))}

          {/* Current transcript (user speaking) */}
          {transcript && state === 'processing' && (
            <Card className="p-3 bg-primary/10 border-primary/20">
              <div className="text-xs text-foreground/60">You</div>
              <p className="mt-1 text-sm text-foreground">{transcript}</p>
            </Card>
          )}

          {/* Current response (assistant speaking) */}
          {response && (
            <Card className="p-3 bg-surface border-border">
              <div className="text-xs text-foreground/60">Assistant</div>
              <p className="mt-1 text-sm text-foreground">{response}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-center gap-4">
          {state === 'idle' || state === 'error' ? (
            <Button
              variant="primary"
              size="lg"
              onClick={startListening}
              disabled={!isConnected}
              className="gap-2"
            >
              <Mic className="h-5 w-5" />
              Start Listening
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={stopListening}
                className="gap-2"
              >
                <MicOff className="h-5 w-5" />
                Stop
              </Button>

              {state === 'speaking' && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleInterrupt}
                  className="gap-2"
                >
                  <VolumeX className="h-5 w-5" />
                  Interrupt
                </Button>
              )}
            </>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-foreground/50">
          {state === 'idle' && 'Click to start voice conversation'}
          {state === 'listening' && 'Speak naturally, pause when done'}
          {state === 'processing' && 'Processing your request...'}
          {state === 'speaking' && 'You can interrupt by speaking'}
        </p>
      </div>
    </div>
  );
}
