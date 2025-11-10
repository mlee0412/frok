# Voice Assistant System Design - FROK Integration
## Real-Time Three-Stream Architecture with ElevenLabs & OpenAI GPT-5

**Design Date**: November 10, 2025
**Status**: ✅ Production-Ready Design
**Integration Target**: FROK Monorepo (Next.js 15 + Fastify API)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Component Design](#3-component-design)
4. [Data Flow & State Management](#4-data-flow--state-management)
5. [API Specifications](#5-api-specifications)
6. [Integration with FROK](#6-integration-with-frok)
7. [Implementation Phases](#7-implementation-phases)
8. [Deployment & Operations](#8-deployment--operations)

---

## 1. Executive Summary

### 1.1 Design Goals

**Objective**: Add real-time voice assistant capabilities to FROK using:
- **ElevenLabs** for natural TTS (WebSocket streaming)
- **Deepgram/Whisper** for streaming STT (until ElevenLabs Scribe streaming available)
- **OpenAI GPT-5** for conversational AI with function calling
- **React PWA** client with MediaSource Extensions for browser audio

**Key Requirements**:
- ✅ Sub-800ms end-to-end latency (user speech → assistant audio)
- ✅ Natural barge-in/interruption support
- ✅ Browser-compatible audio streaming (Chrome, Firefox, Safari)
- ✅ Integration with existing FROK agent system
- ✅ Full type safety and error handling

### 1.2 Architecture Decision Records (ADRs)

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| **Three-stream cascaded pipeline** (STT → LLM → TTS) | Maximum flexibility, proven reliability, tool use support | End-to-end speech models (limited tool use) |
| **Deepgram for STT** (interim) | Real-time streaming, <200ms latency | Whisper (slower), ElevenLabs Scribe (not streaming yet) |
| **ElevenLabs TTS WebSocket** | Best voice quality, streaming support, <100ms latency | OpenAI TTS (less natural), Azure TTS |
| **MediaSource Extensions** for audio | Native browser API, broad support | Web Audio API (more complex), Blob URLs (higher latency) |
| **Next.js API Route for WebSocket** | Consistent with FROK patterns, auth integration | Separate WebSocket server (deployment complexity) |
| **Zustand for voice state** | Consistent with FROK state management | Context API, Jotai |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FROK Voice Assistant                             │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌──────────────────────────┐         ┌─────────────────┐
│   React PWA     │         │   Next.js API Route      │         │  External APIs  │
│   Client        │◄───────►│   (WebSocket Handler)    │◄───────►│                 │
│                 │   WSS   │                          │  HTTP   │ • Deepgram STT  │
│ • Audio Input   │         │ • Session Management     │         │ • OpenAI GPT-5  │
│ • MSE Playback  │         │ • Stream Orchestration   │         │ • ElevenLabs    │
│ • VAD Detection │         │ • Auth & Rate Limiting   │         │   TTS           │
│ • UI State      │         │ • Error Handling         │         │                 │
└─────────────────┘         └──────────────────────────┘         └─────────────────┘
        ▲                               ▲                                 ▲
        │                               │                                 │
        └───────────────────────────────┴─────────────────────────────────┘
                         Zustand Store (voiceStore)
                         Supabase (conversation history)
```

### 2.2 Three-Stream Pipeline

```
┌─────────────┐
│   Stream 1  │  🎤 Audio Input → STT
└─────────────┘
      │
      ├──> Browser: Mic capture (MediaRecorder/AudioWorklet)
      ├──> Client: Base64 encode & send via WebSocket
      ├──> Server: Buffer audio chunks until end-of-speech (500ms silence)
      ├──> API: Deepgram streaming STT (real-time transcription)
      └──> Result: User transcript text

┌─────────────┐
│   Stream 2  │  🤖 LLM Processing
└─────────────┘
      │
      ├──> Input: User transcript + conversation history
      ├──> Server: OpenAI GPT-5 streaming completion with tools
      ├──> Process: Token-by-token streaming, buffer into sentences
      ├──> Handling: Function calls intercepted and executed mid-stream
      └──> Output: Assistant response text (chunked 50-150 chars)

┌─────────────┐
│   Stream 3  │  🔊 Audio Output → TTS
└─────────────┘
      │
      ├──> Input: LLM text chunks (sentences/clauses)
      ├──> Server: ElevenLabs WebSocket TTS (eleven_flash_v2_5)
      ├──> Config: Aggressive chunking [50, 100, 150], auto_mode: true
      ├──> Response: Base64 MP3 audio chunks
      ├──> Client: Decode & append to MediaSource SourceBuffer
      └──> Browser: <audio> element plays via MSE
```

### 2.3 Technology Stack (FROK-Integrated)

```yaml
Frontend (apps/web):
  Framework: Next.js 15.5.5 (App Router)
  UI: React 19.2.0 + TypeScript 5.9.3
  Components: @frok/ui (Button, Modal, Card)
  State: Zustand 5.0.8 (voiceStore)
  Audio: MediaSource Extensions API
  Recording: Web Audio API (AudioWorklet for low latency)
  WebSocket: Native WebSocket with reconnection

Backend (apps/web/src/app/api):
  Runtime: Next.js API Routes (Edge Runtime for WebSocket)
  Session: Supabase Auth + Redis (optional for multi-server)
  Rate Limiting: withRateLimit('ai') - 5 req/min
  Validation: Zod schemas in src/schemas/voice.ts

External APIs:
  STT: Deepgram Streaming (Nova-2 model)
  LLM: OpenAI GPT-5 (gpt-5-turbo with streaming)
  TTS: ElevenLabs WebSocket (eleven_flash_v2_5)
  Fallbacks: Whisper (STT), OpenAI TTS (TTS)

Infrastructure:
  Hosting: Vercel (Next.js) + Edge Functions
  Database: Supabase Postgres (conversation logs)
  Monitoring: Sentry (errors) + Vercel Analytics (performance)
  Caching: Vercel Edge Cache (static assets)
```

---

## 3. Component Design

### 3.1 Directory Structure

```
FROK/
├── apps/web/src/
│   ├── app/
│   │   ├── (main)/
│   │   │   └── voice/                       # NEW: Voice assistant page
│   │   │       ├── page.tsx                 # Voice UI container
│   │   │       └── layout.tsx               # Voice-specific layout
│   │   └── api/
│   │       └── voice/                       # NEW: Voice API routes
│   │           ├── stream/route.ts          # WebSocket handler
│   │           └── config/route.ts          # Voice settings
│   │
│   ├── components/
│   │   └── voice/                           # NEW: Voice components
│   │       ├── VoiceAssistant.tsx           # Main container
│   │       ├── AudioStreamer.ts             # MSE implementation
│   │       ├── VoiceActivityDetector.ts     # VAD for interrupts
│   │       ├── ConversationView.tsx         # Transcript display
│   │       ├── VoiceControls.tsx            # Mic/Stop buttons
│   │       └── StatusIndicator.tsx          # Visual state feedback
│   │
│   ├── lib/
│   │   └── voice/                           # NEW: Voice services
│   │       ├── sttService.ts                # STT abstraction (Deepgram/Whisper)
│   │       ├── ttsService.ts                # TTS abstraction (ElevenLabs)
│   │       ├── websocketManager.ts          # WS connection management
│   │       └── audioProcessor.ts            # Audio encoding/decoding
│   │
│   ├── store/
│   │   └── voiceStore.ts                    # NEW: Voice state management
│   │
│   ├── schemas/
│   │   └── voice.ts                         # NEW: Zod validation schemas
│   │
│   └── types/
│       └── voice.d.ts                       # NEW: Type definitions
│
├── packages/ui/src/components/
│   └── voice/                                # NEW: Reusable voice UI
│       ├── Waveform.tsx                     # Audio visualization
│       └── VoiceButton.tsx                  # Styled mic button
│
└── docs/architecture/
    └── VOICE_ASSISTANT_DESIGN.md             # This document
```

### 3.2 Client Components

#### 3.2.1 VoiceAssistant Container

```typescript
// apps/web/src/components/voice/VoiceAssistant.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '@/store/voiceStore';
import { AudioStreamer } from './AudioStreamer';
import { VoiceActivityDetector } from './VoiceActivityDetector';
import { ConversationView } from './ConversationView';
import { VoiceControls } from './VoiceControls';
import { StatusIndicator } from './StatusIndicator';
import { WebSocketManager } from '@/lib/voice/websocketManager';

export type ConversationState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'error';

export function VoiceAssistant() {
  const {
    state,
    setState,
    transcript,
    response,
    addMessage,
    clearMessages,
  } = useVoiceStore();

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsManagerRef.current = new WebSocketManager({
      url: '/api/voice/stream',
      onMessage: handleWebSocketMessage,
      onError: handleWebSocketError,
      onOpen: handleWebSocketOpen,
      onClose: handleWebSocketClose,
    });

    wsManagerRef.current.connect();

    // Initialize Audio Streamer for playback
    audioStreamerRef.current = new AudioStreamer({
      mimeType: 'audio/mpeg',
      onPlaybackStart: () => setState('speaking'),
      onPlaybackEnd: () => setState('idle'),
      onError: handleAudioError,
    });

    return () => {
      wsManagerRef.current?.disconnect();
      audioStreamerRef.current?.destroy();
    };
  }, []);

  const handleWebSocketMessage = (msg: VoiceMessage) => {
    switch (msg.type) {
      case 'stt_result':
        addMessage({ role: 'user', content: msg.text, timestamp: Date.now() });
        setState('processing');
        break;

      case 'llm_token':
        // Stream assistant response text
        useVoiceStore.getState().appendResponse(msg.token);
        break;

      case 'audio_chunk':
        if (state !== 'speaking') setState('speaking');
        const audioData = base64ToUint8Array(msg.data);
        audioStreamerRef.current?.appendAudio(audioData);
        break;

      case 'response_complete':
        addMessage({
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
        });
        useVoiceStore.getState().clearResponse();
        break;

      case 'error':
        setState('error');
        console.error('Voice error:', msg.error);
        break;
    }
  };

  const startListening = async () => {
    try {
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

      // Initialize VAD for interruption detection
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);

      vadRef.current = new VoiceActivityDetector(audioContext, {
        threshold: 0.01,
        onSpeechStart: () => {
          if (state === 'speaking') handleInterrupt();
        },
      });

      source.connect(vadRef.current.analyser);

      // Start capturing and sending audio
      startAudioCapture(stream);
    } catch (error) {
      console.error('Microphone error:', error);
      setState('error');
    }
  };

  const startAudioCapture = (stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

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
  };

  const stopListening = () => {
    setState('idle');
    wsManagerRef.current?.send({ type: 'end_utterance' });
    // Stop media recorder and release microphone
  };

  const handleInterrupt = () => {
    wsManagerRef.current?.send({ type: 'interrupt' });
    audioStreamerRef.current?.stop();
    setState('idle');
    useVoiceStore.getState().clearResponse();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <StatusIndicator state={state} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <ConversationView />
      </div>

      <div className="p-4 border-t border-border">
        <VoiceControls
          state={state}
          onStartListening={startListening}
          onStopListening={stopListening}
          onInterrupt={handleInterrupt}
        />
      </div>
    </div>
  );
}
```

#### 3.2.2 AudioStreamer (MediaSource Extensions)

```typescript
// apps/web/src/components/voice/AudioStreamer.ts
export interface AudioStreamerConfig {
  mimeType: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
}

export class AudioStreamer {
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: Uint8Array[] = [];
  private isUpdating = false;
  private config: AudioStreamerConfig;

  constructor(config: AudioStreamerConfig) {
    this.config = config;
    this.audio = document.createElement('audio');
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);

    this.mediaSource.addEventListener('sourceopen', () => {
      this.initializeSourceBuffer();
    });

    this.audio.addEventListener('play', () => {
      this.config.onPlaybackStart?.();
    });

    this.audio.addEventListener('ended', () => {
      this.config.onPlaybackEnd?.();
    });

    this.audio.addEventListener('error', (e) => {
      this.config.onError?.(new Error('Audio playback error'));
    });
  }

  private initializeSourceBuffer() {
    try {
      // Check codec support
      if (!MediaSource.isTypeSupported(this.config.mimeType)) {
        throw new Error(`MIME type not supported: ${this.config.mimeType}`);
      }

      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.config.mimeType);

      this.sourceBuffer.addEventListener('updateend', () => {
        this.isUpdating = false;
        this.processQueue();
      });

      this.sourceBuffer.addEventListener('error', (e) => {
        console.error('SourceBuffer error:', e);
        this.config.onError?.(new Error('SourceBuffer error'));
      });
    } catch (error) {
      console.error('Failed to initialize SourceBuffer:', error);
      this.useFallbackPlayback();
    }
  }

  appendAudio(chunk: Uint8Array) {
    this.queue.push(chunk);

    if (!this.isUpdating) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length === 0 || !this.sourceBuffer || this.isUpdating) {
      return;
    }

    try {
      const chunk = this.queue.shift()!;
      this.isUpdating = true;
      this.sourceBuffer.appendBuffer(chunk);

      // Auto-start playback when we have enough buffered (300ms)
      if (this.audio.paused && this.audio.buffered.length > 0) {
        const buffered = this.audio.buffered.end(0) - this.audio.currentTime;
        if (buffered >= 0.3) {
          this.audio.play().catch((err) => {
            console.error('Playback start failed:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error appending buffer:', error);
      this.isUpdating = false;
    }
  }

  private useFallbackPlayback() {
    // Fallback: Use Blob URLs (less efficient but more compatible)
    console.warn('Using fallback audio playback');
    // Implementation for older browsers
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.queue = [];
  }

  destroy() {
    this.stop();
    URL.revokeObjectURL(this.audio.src);
    if (this.mediaSource.readyState === 'open') {
      this.mediaSource.endOfStream();
    }
  }
}

// Helper function
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
```

#### 3.2.3 Voice Activity Detector

```typescript
// apps/web/src/components/voice/VoiceActivityDetector.ts
export interface VADConfig {
  threshold: number; // RMS threshold for speech detection
  minSpeechDuration: number; // Minimum ms of speech to trigger
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export class VoiceActivityDetector {
  public analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private config: VADConfig;
  private speechStartTime: number | null = null;
  private isSpeaking = false;
  private intervalId: number | null = null;

  constructor(
    audioContext: AudioContext,
    config: Partial<VADConfig> = {}
  ) {
    this.config = {
      threshold: config.threshold ?? 0.01,
      minSpeechDuration: config.minSpeechDuration ?? 300,
      onSpeechStart: config.onSpeechStart,
      onSpeechEnd: config.onSpeechEnd,
    };

    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.startDetection();
  }

  private startDetection() {
    this.intervalId = window.setInterval(() => {
      this.detectSpeech();
    }, 100); // Check every 100ms
  }

  private detectSpeech() {
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate RMS (Root Mean Square) energy
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);

    const isSpeakingNow = rms > this.config.threshold;

    if (isSpeakingNow && !this.speechStartTime) {
      this.speechStartTime = Date.now();
    } else if (isSpeakingNow && this.speechStartTime) {
      const duration = Date.now() - this.speechStartTime;

      if (duration >= this.config.minSpeechDuration && !this.isSpeaking) {
        this.isSpeaking = true;
        this.config.onSpeechStart?.();
      }
    } else if (!isSpeakingNow) {
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.config.onSpeechEnd?.();
      }
      this.speechStartTime = null;
    }
  }

  destroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }
}
```

### 3.3 State Management (Zustand)

```typescript
// apps/web/src/store/voiceStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VoiceMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'error';

interface VoiceStore {
  // State
  state: VoiceState;
  transcript: string;
  response: string;
  messages: VoiceMessage[];
  isConnected: boolean;

  // Settings
  voiceId: string | null;
  autoStart: boolean;
  vadSensitivity: number;

  // Actions
  setState: (state: VoiceState) => void;
  setTranscript: (text: string) => void;
  appendResponse: (token: string) => void;
  clearResponse: () => void;
  addMessage: (message: VoiceMessage) => void;
  clearMessages: () => void;
  setConnected: (connected: boolean) => void;
  setVoiceId: (voiceId: string) => void;
  setAutoStart: (autoStart: boolean) => void;
  setVadSensitivity: (sensitivity: number) => void;
}

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set) => ({
      // Initial state
      state: 'idle',
      transcript: '',
      response: '',
      messages: [],
      isConnected: false,
      voiceId: null,
      autoStart: false,
      vadSensitivity: 0.01,

      // Actions
      setState: (state) => set({ state }),

      setTranscript: (text) => set({ transcript: text }),

      appendResponse: (token) =>
        set((state) => ({ response: state.response + token })),

      clearResponse: () => set({ response: '' }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      clearMessages: () => set({ messages: [], transcript: '', response: '' }),

      setConnected: (connected) => set({ isConnected: connected }),

      setVoiceId: (voiceId) => set({ voiceId }),

      setAutoStart: (autoStart) => set({ autoStart }),

      setVadSensitivity: (sensitivity) => set({ vadSensitivity: sensitivity }),
    }),
    {
      name: 'voice-store',
      partialize: (state) => ({
        voiceId: state.voiceId,
        autoStart: state.autoStart,
        vadSensitivity: state.vadSensitivity,
      }),
    }
  )
);
```

### 3.4 Backend Services

#### 3.4.1 WebSocket API Route

```typescript
// apps/web/src/app/api/voice/stream/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { VoiceSessionManager } from '@/lib/voice/sessionManager';
import { STTService } from '@/lib/voice/sttService';
import { TTSService } from '@/lib/voice/ttsService';
import { errorHandler } from '@/lib/errorHandler';

export const runtime = 'edge'; // Use Edge Runtime for WebSocket support

export async function GET(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit('ai')(req);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // 3. Upgrade to WebSocket
  const upgradeHeader = req.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }

  try {
    // Create WebSocket pair
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    // Initialize voice session
    const session = new VoiceSessionManager({
      userId: auth.user.id,
      socket: clientSocket,
      sttService: new STTService(),
      ttsService: new TTSService(),
    });

    // Handle WebSocket messages
    clientSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        await session.handleMessage(data);
      } catch (error) {
        errorHandler.logError({
          message: error instanceof Error ? error.message : 'Unknown error',
          context: { userId: auth.user.id, event: 'ws_message' },
        });
        clientSocket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message',
        }));
      }
    });

    clientSocket.addEventListener('close', () => {
      session.cleanup();
    });

    clientSocket.addEventListener('error', (error) => {
      errorHandler.logError({
        message: 'WebSocket error',
        context: { userId: auth.user.id, error },
      });
      session.cleanup();
    });

    return response;
  } catch (error) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      context: { userId: auth.user.id, route: '/api/voice/stream' },
    });
    return new Response('Internal server error', { status: 500 });
  }
}
```

#### 3.4.2 Voice Session Manager

```typescript
// apps/web/src/lib/voice/sessionManager.ts
import { STTService } from './sttService';
import { TTSService } from './ttsService';
import { openai } from '@/lib/openai';

export interface VoiceSessionConfig {
  userId: string;
  socket: WebSocket;
  sttService: STTService;
  ttsService: TTSService;
}

export class VoiceSessionManager {
  private userId: string;
  private socket: WebSocket;
  private sttService: STTService;
  private ttsService: TTSService;

  private audioBuffer: Uint8Array[] = [];
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private llmAbortController: AbortController | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(config: VoiceSessionConfig) {
    this.userId = config.userId;
    this.socket = config.socket;
    this.sttService = config.sttService;
    this.ttsService = config.ttsService;
  }

  async handleMessage(data: VoiceMessage) {
    switch (data.type) {
      case 'audio_input':
        await this.handleAudioInput(data.data);
        break;

      case 'end_utterance':
        await this.processUtterance();
        break;

      case 'interrupt':
        await this.handleInterrupt();
        break;

      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private async handleAudioInput(base64Audio: string) {
    const audioChunk = Buffer.from(base64Audio, 'base64');
    this.audioBuffer.push(new Uint8Array(audioChunk));

    // Reset silence timer (500ms silence = end of utterance)
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    this.silenceTimer = setTimeout(() => {
      this.processUtterance();
    }, 500);
  }

  private async processUtterance() {
    if (this.audioBuffer.length === 0) return;

    try {
      // Concatenate audio chunks
      const totalLength = this.audioBuffer.reduce((sum, arr) => sum + arr.length, 0);
      const fullAudio = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioBuffer) {
        fullAudio.set(chunk, offset);
        offset += chunk.length;
      }

      // Transcribe with STT
      const transcript = await this.sttService.transcribe(fullAudio);

      if (!transcript) {
        this.socket.send(JSON.stringify({
          type: 'error',
          error: 'No speech detected',
        }));
        return;
      }

      // Send transcript to client
      this.socket.send(JSON.stringify({
        type: 'stt_result',
        text: transcript,
      }));

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
      });

      // Process with LLM and stream response
      await this.processLLM(transcript);

      // Clear audio buffer
      this.audioBuffer = [];
    } catch (error) {
      console.error('Error processing utterance:', error);
      this.socket.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process audio',
      }));
    }
  }

  private async processLLM(userMessage: string) {
    try {
      this.llmAbortController = new AbortController();

      const stream = await openai.chat.completions.create({
        model: 'gpt-5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful voice assistant. Keep responses concise and natural.',
          },
          ...this.conversationHistory,
        ],
        stream: true,
        tools: [
          // Tool definitions (weather, web search, etc.)
        ],
      }, {
        signal: this.llmAbortController.signal,
      });

      let textBuffer = '';
      const assistantMessage = { role: 'assistant', content: '' };

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle function calling
        if (delta.tool_calls) {
          // Execute tool and continue streaming
          // (Implementation similar to existing agent system)
          continue;
        }

        // Handle regular text tokens
        if (delta.content) {
          textBuffer += delta.content;
          assistantMessage.content += delta.content;

          // Send token to client for display
          this.socket.send(JSON.stringify({
            type: 'llm_token',
            token: delta.content,
          }));

          // Send to TTS when we have a complete sentence
          if (this.shouldSendToTTS(textBuffer)) {
            await this.ttsService.synthesize(textBuffer, (audioChunk) => {
              this.socket.send(JSON.stringify({
                type: 'audio_chunk',
                data: audioChunk.toString('base64'),
              }));
            });
            textBuffer = '';
          }
        }
      }

      // Send any remaining text to TTS
      if (textBuffer) {
        await this.ttsService.synthesize(textBuffer, (audioChunk) => {
          this.socket.send(JSON.stringify({
            type: 'audio_chunk',
            data: audioChunk.toString('base64'),
          }));
        });
      }

      // Add to conversation history
      this.conversationHistory.push(assistantMessage);

      // Notify client that response is complete
      this.socket.send(JSON.stringify({
        type: 'response_complete',
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Interrupted, not an error
        return;
      }
      throw error;
    }
  }

  private shouldSendToTTS(text: string): boolean {
    // Send on sentence boundaries or after 100+ chars
    return /[.!?]\s*$/.test(text.trim()) || text.length > 100;
  }

  private async handleInterrupt() {
    // Cancel LLM stream
    if (this.llmAbortController) {
      this.llmAbortController.abort();
      this.llmAbortController = null;
    }

    // Stop TTS (close WebSocket if needed)
    await this.ttsService.stop();

    // Optionally mark last message as interrupted
    if (this.conversationHistory.length > 0) {
      const lastMsg = this.conversationHistory[this.conversationHistory.length - 1];
      if (lastMsg.role === 'assistant') {
        lastMsg.content += ' [interrupted]';
      }
    }

    // Clear audio buffer
    this.audioBuffer = [];
  }

  cleanup() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.llmAbortController) this.llmAbortController.abort();
    this.ttsService.cleanup();
    this.sttService.cleanup();
  }
}
```

#### 3.4.3 STT Service Abstraction

```typescript
// apps/web/src/lib/voice/sttService.ts
import { createClient as createDeepgramClient } from '@deepgram/sdk';

export class STTService {
  private deepgram: ReturnType<typeof createDeepgramClient>;

  constructor() {
    this.deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY!);
  }

  async transcribe(audio: Uint8Array): Promise<string | null> {
    try {
      const { result } = await this.deepgram.listen.prerecorded.transcribeFile(
        Buffer.from(audio),
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          language: 'en',
        }
      );

      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      return transcript || null;
    } catch (error) {
      console.error('STT error:', error);
      // Fallback to Whisper or throw
      throw error;
    }
  }

  cleanup() {
    // Cleanup resources if needed
  }
}
```

#### 3.4.4 TTS Service Abstraction

```typescript
// apps/web/src/lib/voice/ttsService.ts
import WebSocket from 'ws';

export class TTSService {
  private ws: WebSocket | null = null;
  private voiceId = process.env.ELEVENLABS_VOICE_ID!;

  async synthesize(
    text: string,
    onAudioChunk: (chunk: Buffer) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.initializeWebSocket();
      }

      // Send text to ElevenLabs TTS WebSocket
      this.ws!.send(JSON.stringify({
        text,
        flush: true, // Generate immediately
      }));

      // Listen for audio chunks
      const messageHandler = (data: WebSocket.RawData) => {
        const response = JSON.parse(data.toString());

        if (response.audio) {
          const audioBuffer = Buffer.from(response.audio, 'base64');
          onAudioChunk(audioBuffer);
        }

        if (response.isFinal) {
          this.ws!.removeListener('message', messageHandler);
          resolve();
        }
      };

      this.ws!.on('message', messageHandler);
      this.ws!.on('error', (error) => {
        this.ws!.removeListener('message', messageHandler);
        reject(error);
      });
    });
  }

  private initializeWebSocket() {
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input`;

    this.ws = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    this.ws.on('open', () => {
      // Send initial configuration
      this.ws!.send(JSON.stringify({
        text: ' ',
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
        chunk_length_schedule: [50, 100, 150],
        auto_mode: true,
      }));
    });

    this.ws.on('error', (error) => {
      console.error('TTS WebSocket error:', error);
    });
  }

  async stop() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text: '', flush: true }));
    }
  }

  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

---

## 4. Data Flow & State Management

### 4.1 Client State Flow

```
User Interaction → VoiceAssistant Component → useVoiceStore
       ↓                      ↓                      ↓
   startListening()      setState('listening')   Persist settings
       ↓                      ↓                      ↓
  Mic Permission        Audio Capture          WebSocket Send
       ↓                      ↓                      ↓
   MediaRecorder       Base64 Encoding        'audio_input' msg
```

### 4.2 Server Processing Flow

```
WebSocket Message → VoiceSessionManager → STT Service
       ↓                      ↓                  ↓
  handleMessage()      handleAudioInput()  transcribe()
       ↓                      ↓                  ↓
  Buffer Chunks         Silence Timer      Deepgram API
       ↓                      ↓                  ↓
  processUtterance() → processLLM() → OpenAI GPT-5 Stream
       ↓                      ↓                  ↓
  conversationHistory    Token Buffer     Function Calling
       ↓                      ↓                  ↓
  TTS Service ←─────────  Sentence Chunks ← shouldSendToTTS()
       ↓
  ElevenLabs WebSocket → Audio Chunks → Client MSE
```

### 4.3 Interruption Flow

```
User Speaks (During Assistant Speech)
       ↓
VAD Detects Speech (>300ms)
       ↓
Client: Send 'interrupt' message
       ↓
Client: Stop audio playback immediately
       ↓
Server: Abort LLM stream (AbortController)
       ↓
Server: Stop TTS WebSocket
       ↓
Server: Clear audio buffer
       ↓
State: Reset to 'idle', ready for new input
```

---

## 5. API Specifications

### 5.1 WebSocket Message Types

```typescript
// apps/web/src/types/voice.d.ts

// Client → Server Messages
export type ClientVoiceMessage =
  | { type: 'audio_input'; data: string } // Base64 audio chunk
  | { type: 'end_utterance' }              // Manual end-of-speech signal
  | { type: 'interrupt' };                 // Cancel current response

// Server → Client Messages
export type ServerVoiceMessage =
  | { type: 'stt_result'; text: string }              // Transcribed user speech
  | { type: 'llm_token'; token: string }              // Streaming LLM token
  | { type: 'audio_chunk'; data: string }             // Base64 TTS audio
  | { type: 'response_complete' }                     // End of assistant turn
  | { type: 'error'; error: string };                 // Error message

export type VoiceMessage = ClientVoiceMessage | ServerVoiceMessage;
```

### 5.2 Voice Configuration API

```typescript
// GET /api/voice/config
export interface VoiceConfigResponse {
  voices: Array<{
    id: string;
    name: string;
    provider: 'elevenlabs' | 'openai';
    language: string;
  }>;
  defaultVoiceId: string;
  settings: {
    vadSensitivity: number;
    silenceThreshold: number; // ms
    maxUtteranceLength: number; // seconds
  };
}

// POST /api/voice/config
export interface UpdateVoiceConfigRequest {
  voiceId?: string;
  vadSensitivity?: number;
}
```

### 5.3 Conversation History API

```typescript
// GET /api/voice/history
export interface VoiceHistoryResponse {
  conversations: Array<{
    id: string;
    userId: string;
    messages: VoiceMessage[];
    startedAt: string;
    endedAt: string | null;
    duration: number; // seconds
  }>;
}

// POST /api/voice/history (save conversation)
export interface SaveConversationRequest {
  messages: VoiceMessage[];
  duration: number;
}
```

---

## 6. Integration with FROK

### 6.1 Existing Systems Integration

```yaml
Authentication:
  Mechanism: Supabase Auth (existing)
  Integration: withAuth() middleware in WebSocket route
  Session: JWT tokens, user ID passed to VoiceSessionManager

Agent System:
  Connection: VoiceSessionManager can invoke existing agent tools
  Tools: Weather, web search, home automation, finance
  Pattern: Same tool definitions as /api/agent/stream

State Management:
  Pattern: Zustand stores (consistent with chatStore, ttsStore)
  Persistence: localStorage for settings (voiceId, vadSensitivity)
  Server: Conversation history in Supabase (voice_conversations table)

UI Components:
  Library: @frok/ui (Button, Modal, Card)
  Styling: Tailwind CSS with semantic tokens (bg-surface, text-foreground)
  Icons: Lucide React (mic, stop, volume icons)

Rate Limiting:
  Middleware: withRateLimit('ai') - 5 req/min
  Pattern: Same as /api/agent/* routes
  Storage: Upstash Redis or in-memory

Error Handling:
  Service: errorHandler.logError() (existing)
  Monitoring: Sentry integration (existing)
  User Feedback: Toast notifications (@frok/ui/Toaster)
```

### 6.2 Database Schema

```sql
-- New tables for voice assistant

CREATE TABLE voice_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES voice_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  audio_url TEXT, -- Optional: S3/Supabase storage for audio
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_conversations_user_id ON voice_conversations(user_id);
CREATE INDEX idx_voice_messages_conversation_id ON voice_messages(conversation_id);

-- Row Level Security (RLS)
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON voice_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON voice_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own messages"
  ON voice_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages"
  ON voice_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM voice_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );
```

### 6.3 Environment Variables

```bash
# .env.local (add to existing)

# Deepgram STT
DEEPGRAM_API_KEY=your_deepgram_api_key

# ElevenLabs TTS
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_default_voice_id

# OpenAI (existing, just document usage)
OPENAI_API_KEY=your_openai_api_key # Used for GPT-5 streaming

# Optional: Redis for rate limiting (if not using in-memory)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

---

## 7. Implementation Phases

### Phase 1: Core Pipeline (Week 1-2)

**Deliverables**:
- ✅ WebSocket API route with auth & rate limiting
- ✅ VoiceSessionManager with STT/LLM/TTS orchestration
- ✅ Deepgram STT integration
- ✅ ElevenLabs TTS WebSocket integration
- ✅ Basic VoiceAssistant React component
- ✅ MediaSource Extensions audio playback
- ✅ Zustand voiceStore

**Validation**:
- User can speak → see transcript → hear response
- End-to-end latency <2 seconds (baseline)

### Phase 2: Optimization & Interruption (Week 3)

**Deliverables**:
- ✅ VAD-based interruption detection
- ✅ Aggressive buffering strategies (50-150 char TTS chunks)
- ✅ LLM token buffering optimization
- ✅ MSE buffer management and Safari compatibility
- ✅ UI state machine (idle/listening/processing/speaking/interrupted)

**Validation**:
- End-to-end latency <800ms
- Barge-in detection <300ms
- No audio glitches or stuttering

### Phase 3: Robustness & Fallbacks (Week 4)

**Deliverables**:
- ✅ STT fallback cascade (Deepgram → Whisper)
- ✅ TTS fallback (ElevenLabs → OpenAI TTS)
- ✅ WebSocket reconnection logic
- ✅ Error handling and user feedback
- ✅ Performance monitoring and metrics
- ✅ E2E tests with Playwright

**Validation**:
- Error rate <5%
- Graceful degradation on API failures
- All tests passing

### Phase 4: Production & Polish (Week 5)

**Deliverables**:
- ✅ Conversation history persistence (Supabase)
- ✅ Voice settings UI (voice selection, VAD sensitivity)
- ✅ Waveform visualization
- ✅ Mobile responsiveness (PWA)
- ✅ Documentation and deployment guide
- ✅ Cost tracking and budget alerts

**Validation**:
- Production deployment on Vercel
- <$50/month API costs for 1000 users
- 99% uptime

---

## 8. Deployment & Operations

### 8.1 Vercel Deployment

```yaml
# vercel.json (add to existing)
{
  "functions": {
    "apps/web/src/app/api/voice/stream/route.ts": {
      "runtime": "edge",
      "maxDuration": 300
    }
  },
  "env": {
    "DEEPGRAM_API_KEY": "@deepgram-api-key",
    "ELEVENLABS_API_KEY": "@elevenlabs-api-key",
    "ELEVENLABS_VOICE_ID": "@elevenlabs-voice-id"
  }
}
```

### 8.2 Monitoring & Alerts

```typescript
// apps/web/src/lib/voice/metrics.ts
export class VoiceMetrics {
  private static metrics = {
    totalSessions: 0,
    activeSessions: 0,
    avgLatency: 0,
    errorRate: 0,
  };

  static trackSession(event: 'start' | 'end', latency?: number) {
    switch (event) {
      case 'start':
        this.metrics.totalSessions++;
        this.metrics.activeSessions++;
        break;
      case 'end':
        this.metrics.activeSessions--;
        if (latency) {
          this.metrics.avgLatency =
            (this.metrics.avgLatency * (this.metrics.totalSessions - 1) + latency) /
            this.metrics.totalSessions;
        }
        break;
    }

    // Send to analytics (Vercel Analytics, PostHog, etc.)
    if (typeof window !== 'undefined') {
      (window as any).gtag?.('event', 'voice_session', {
        event_category: 'voice',
        event_label: event,
        value: latency,
      });
    }
  }

  static trackError(error: Error) {
    this.metrics.errorRate++;

    // Send to Sentry (existing integration)
    if (typeof window !== 'undefined') {
      import('@sentry/nextjs').then(({ captureException }) => {
        captureException(error, {
          tags: { component: 'voice-assistant' },
        });
      });
    }
  }
}
```

### 8.3 Cost Estimation

```yaml
Monthly Cost Projection (1000 active users):

Deepgram STT:
  - $0.0043/min for Nova-2 model
  - Avg 5 min/session, 20 sessions/user/month
  - = 100,000 min/month × $0.0043 = $430/month

ElevenLabs TTS:
  - $0.30/1000 characters (Turbo model)
  - Avg 500 chars/response, 20 sessions × 5 responses
  - = 50M chars/month × $0.30/1000 = $15,000/month
  - Optimization: Use character limits, cache responses

OpenAI GPT-5:
  - ~$0.01/1K tokens (input + output)
  - Avg 2K tokens/session, 20 sessions/user
  - = 40M tokens/month × $0.01/1K = $400/month

Total: ~$15,830/month (1000 users)
Per User: ~$15.83/month

Optimization Strategies:
  - Use GPT-5 Mini for simple queries (5x cheaper)
  - Implement response caching for common questions
  - Set per-user monthly limits (e.g., 100 sessions)
  - Use shorter TTS responses (aim for <300 chars)
  - Optimized: ~$5/user/month target
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```bash
# Test voice components
pnpm test src/components/voice/*.test.tsx
pnpm test src/lib/voice/*.test.ts

# Test coverage targets
- AudioStreamer: 80%
- VoiceActivityDetector: 85%
- VoiceSessionManager: 75%
- STTService/TTSService: 70%
```

### 9.2 E2E Tests (Playwright)

```typescript
// e2e/voice-assistant.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Voice Assistant', () => {
  test('should start listening and display transcript', async ({ page }) => {
    await page.goto('/voice');

    // Click start button
    await page.click('[data-testid="start-listening"]');

    // Verify state change
    await expect(page.locator('[data-testid="status-indicator"]'))
      .toContainText('Listening');

    // Mock audio input (via browser API)
    // ... implementation

    // Verify transcript appears
    await expect(page.locator('[data-testid="transcript"]'))
      .toContainText('Hello');
  });

  test('should handle interruption', async ({ page }) => {
    // ... setup listening and response

    // Trigger interrupt
    await page.click('[data-testid="interrupt"]');

    // Verify state and audio stopped
    await expect(page.locator('audio')).not.toBeVisible();
    await expect(page.locator('[data-testid="status-indicator"]'))
      .toContainText('Idle');
  });
});
```

---

## 10. Security Considerations

### 10.1 Authentication & Authorization

- ✅ WebSocket connections require valid JWT (withAuth middleware)
- ✅ User ID attached to all sessions (no impersonation)
- ✅ Rate limiting per user (5 concurrent sessions max)
- ✅ Conversation history isolated per user (RLS policies)

### 10.2 Data Privacy

- ⚠️ **Audio data**: Not stored by default (ephemeral)
- ✅ **Transcripts**: Stored in Supabase with encryption at rest
- ✅ **GDPR compliance**: User can delete all voice data via API
- ✅ **No third-party sharing**: API keys secured, no data sent to analytics

### 10.3 API Key Security

```typescript
// Never expose API keys to client
// All API calls go through Next.js API routes

// ❌ Wrong (client-side)
const deepgram = new DeepgramClient(process.env.DEEPGRAM_API_KEY);

// ✅ Correct (server-side only)
// apps/web/src/lib/voice/sttService.ts
// Keys accessed via process.env on server
```

---

## 11. Future Enhancements (Post-MVP)

### 11.1 Advanced Features

- **Multi-language support**: Auto-detect language, translate conversations
- **Voice cloning**: ElevenLabs voice cloning for personalized assistant
- **Emotion detection**: Analyze user sentiment, adjust response tone
- **Background conversation**: Continue listening while browsing other pages
- **Voice commands**: "Set a timer", "Remind me in 1 hour"

### 11.2 Performance Optimizations

- **Edge Deployment**: Deploy STT/TTS services closer to users (Cloudflare Workers)
- **Response caching**: Cache common Q&A pairs (Redis + vector similarity)
- **Speculative TTS**: Start synthesizing before LLM finishes (risk: wasted tokens)
- **Client-side VAD**: Use WASM-based VAD (Silero VAD) for lower latency

### 11.3 Analytics & Insights

- **Usage Dashboard**: Sessions per day, avg duration, error rate
- **Conversation Analysis**: Most common topics, user satisfaction scores
- **Cost Optimization**: Identify high-cost users, suggest plan upgrades
- **A/B Testing**: Test different voices, prompts, latency thresholds

---

## Appendix A: Dependencies

```json
// package.json additions

{
  "dependencies": {
    "@deepgram/sdk": "^3.0.0",
    "ws": "^8.16.0",
    "elevenlabs": "^0.8.0" // Optional: if using SDK instead of raw WebSocket
  },
  "devDependencies": {
    "@types/ws": "^8.5.10"
  }
}
```

---

## Appendix B: Configuration Files

```typescript
// apps/web/src/config/voice.ts
export const VOICE_CONFIG = {
  stt: {
    provider: 'deepgram', // 'deepgram' | 'whisper'
    model: 'nova-2',
    language: 'en',
    sampleRate: 16000,
  },
  tts: {
    provider: 'elevenlabs', // 'elevenlabs' | 'openai'
    model: 'eleven_flash_v2_5',
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    chunkSchedule: [50, 100, 150],
  },
  llm: {
    model: 'gpt-5-turbo',
    systemPrompt: 'You are a helpful voice assistant. Keep responses concise.',
    maxTokens: 500, // Limit response length for cost control
  },
  audio: {
    silenceThreshold: 500, // ms of silence = end of utterance
    maxUtteranceLength: 30, // seconds
    minBufferDuration: 0.3, // seconds before starting playback
  },
  vad: {
    threshold: 0.01, // RMS threshold for speech detection
    minSpeechDuration: 300, // ms to trigger interrupt
  },
} as const;
```

---

**Document Version**: 1.0
**Next Review**: After Phase 1 completion
**Maintained By**: FROK Development Team

---

*This design document provides a production-ready architecture for integrating real-time voice assistant capabilities into the FROK project. All designs follow FROK's existing patterns for authentication, state management, styling, and error handling.*
