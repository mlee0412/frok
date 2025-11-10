# Integrating ElevenLabs Streaming STT/TTS in Real-Time Voice Assistant
## Comprehensive Research Report

**Research Date**: November 10, 2025
**Researcher**: Claude (SuperClaude Framework with Deep Research Mode)
**Confidence Level**: 85% (High - based on official documentation and current implementations)

---

## Executive Summary

This report provides a comprehensive analysis of implementing a real-time voice assistant using **ElevenLabs streaming STT/TTS**, **OpenAI GPT-5 streaming**, and a **React PWA client** connected via **WebSocket**. The research identifies critical implementation considerations, current API limitations, and production-ready patterns for achieving sub-800ms latency in voice interactions.

### Key Findings

✅ **ElevenLabs TTS WebSocket API**: Production-ready for real-time streaming with configurable latency optimization
⚠️ **ElevenLabs STT**: Currently **NOT streaming-capable** (batch-only) but streaming version expected "in coming weeks" (as of March 2025)
✅ **OpenAI GPT Streaming + Function Calling**: Fully supported with streaming tokens and tool use
✅ **Browser MSE Audio Streaming**: Widely supported across modern browsers (Chrome, Firefox, Safari)
✅ **Barge-in/Interruption**: Well-established patterns using VAD + WebSocket signaling

---

## 1. ElevenLabs API Capabilities & Current Limitations

### 1.1 Text-to-Speech (TTS) - Production Ready ✅

**WebSocket Endpoint**: `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input`

#### Key Features
- **Real-time streaming**: Send text incrementally, receive audio chunks immediately
- **Multi-context support**: Multiple independent audio streams per WebSocket connection
- **Low-latency controls**: Configurable `chunk_length_schedule` for quality vs. latency trade-offs
- **Word-level timestamps**: Available for synchronization (in some modes)
- **Voice customization**: Control stability, speed, and other voice characteristics

#### Latency Optimization
```json
{
  "chunk_length_schedule": [50, 100, 150],  // Aggressive for low latency
  "auto_mode": true,  // Auto-trigger synthesis
  "model_id": "eleven_flash_v2_5"  // ~75ms inference time
}
```

**Default schedule**: `[120, 160, 250, 290]` (better quality, higher latency)
**Recommended for real-time**: `[50, 100, 150]` or lower with `flush: true` for immediate playback

#### Supported Audio Formats
- **Primary**: MP3 (MPEG audio) - best browser support
- **Alternatives**: PCM, Ogg, AAC in MP4 (check codec support)
- **Base64 encoding**: Audio chunks returned as base64 strings in JSON messages

### 1.2 Speech-to-Text (STT) - NOT Streaming Yet ⚠️

**Critical Limitation**: As of March 2025, ElevenLabs **Scribe v1 STT does NOT support streaming**.

#### Current Status
- **API Type**: Batch/post-processing only (single file upload)
- **Accuracy**: "World's most accurate" for 99 languages
- **Features**: Word timestamps, speaker diarization, audio-event tagging
- **Use Case**: High-accuracy transcription, not real-time

#### Timeline
> "A real time streaming version of Scribe, together with a low latency one, are planned for the coming weeks."
> — ElevenLabs Documentation (February-March 2025)

#### Immediate Workarounds
1. **Buffer-then-transcribe**: Accumulate user audio until end-of-speech (500-1000ms silence), then send to Scribe
2. **Fallback STT**: Use OpenAI Whisper, Deepgram, or AssemblyAI for streaming while waiting for ElevenLabs
3. **Hybrid approach**: Use fast STT for transcription, optionally verify with Scribe for critical accuracy

**Recommended**: Use **Deepgram** or **Whisper** for streaming STT in production until ElevenLabs releases streaming Scribe.

---

## 2. Three-Stream WebSocket Architecture

### 2.1 Architecture Overview

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Browser   │◄───────►│  WebSocket Hub   │◄───────►│ ElevenLabs  │
│  (React PWA)│         │   (Node.js)      │         │ STT/TTS API │
└─────────────┘         └──────────────────┘         └─────────────┘
      ▲                         ▲  ▲
      │                         │  │
      │                         │  └──────────────┐
      │                         │                 │
      │                  ┌──────▼──────┐   ┌─────▼─────┐
      │                  │   OpenAI    │   │ Function  │
      │                  │  GPT-5 API  │   │   Tools   │
      │                  └─────────────┘   └───────────┘
      │
   MediaSource
   Extensions
   (Audio Playback)
```

### 2.2 Stream Flows

#### 🎤 Stream 1: Audio Input (Browser → Server → STT)

**Client Side (React PWA)**:
```javascript
// Capture microphone audio
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000
  }
});

// Option 1: MediaRecorder for chunked audio
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = (event) => {
  ws.send(JSON.stringify({
    type: 'audio_input',
    data: arrayBufferToBase64(event.data)
  }));
};

// Option 2: AudioWorklet for PCM streaming (lower latency)
const audioContext = new AudioContext({ sampleRate: 16000 });
const source = audioContext.createMediaStreamSource(stream);
const worklet = await audioContext.audioWorklet.addModule('audio-processor.js');
// Send PCM chunks via WebSocket
```

**Server Side (Node.js)**:
```javascript
// Buffer audio until end-of-speech detected
let audioBuffer = [];
let silenceTimer = null;

ws.on('message', async (msg) => {
  const data = JSON.parse(msg);

  if (data.type === 'audio_input') {
    audioBuffer.push(Buffer.from(data.data, 'base64'));

    // Reset silence timer
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(async () => {
      // 500ms silence = end of utterance
      const fullAudio = Buffer.concat(audioBuffer);

      // Send to STT (ElevenLabs when available, or fallback)
      const transcript = await sttService.transcribe(fullAudio);

      ws.send(JSON.stringify({
        type: 'stt_result',
        text: transcript
      }));

      audioBuffer = [];
    }, 500);
  }
});
```

#### 🤖 Stream 2: LLM Processing (Text → GPT-5 → Streaming Response)

**Server Side**:
```javascript
// OpenAI streaming with function calling
async function processLLM(transcript, conversationHistory) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-5-turbo',
    messages: [
      ...conversationHistory,
      { role: 'user', content: transcript }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description: 'Search the web for information',
          parameters: { /* ... */ }
        }
      }
    ],
    stream: true
  });

  let textBuffer = '';
  let functionCall = null;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;

    // Handle function calling
    if (delta.tool_calls) {
      functionCall = delta.tool_calls[0];
      // Accumulate function call data
      continue;
    }

    // Handle regular text tokens
    if (delta.content) {
      textBuffer += delta.content;

      // Send to TTS when we have a complete sentence/clause
      if (shouldSendToTTS(textBuffer)) {
        await sendToTTS(textBuffer);
        textBuffer = '';
      }
    }
  }

  // Handle any remaining text
  if (textBuffer) await sendToTTS(textBuffer);
}

function shouldSendToTTS(text) {
  // Send on sentence boundaries or after ~50-100 chars
  return /[.!?]$/.test(text.trim()) || text.length > 100;
}
```

**Function Calling Handling**:
```javascript
// If function call detected
if (functionCall) {
  const result = await executeTool(functionCall.name, functionCall.arguments);

  // Continue streaming with tool result
  const followUpStream = await openai.chat.completions.create({
    model: 'gpt-5-turbo',
    messages: [
      ...conversationHistory,
      { role: 'assistant', tool_calls: [functionCall] },
      { role: 'tool', content: result, tool_call_id: functionCall.id }
    ],
    stream: true
  });

  // Continue processing stream...
}
```

#### 🔊 Stream 3: Audio Output (LLM Text → TTS → Browser)

**Server Side (ElevenLabs TTS WebSocket)**:
```javascript
const WebSocket = require('ws');
const ttsWs = new WebSocket(
  `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input`
);

ttsWs.on('open', () => {
  // Initialize TTS settings
  ttsWs.send(JSON.stringify({
    text: ' ',  // Initial text required
    model_id: 'eleven_flash_v2_5',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    },
    chunk_length_schedule: [50, 100, 150],
    auto_mode: true
  }));
});

// Send text to TTS as it arrives from LLM
async function sendToTTS(text) {
  ttsWs.send(JSON.stringify({
    text: text,
    flush: true  // Generate immediately
  }));
}

// Receive audio chunks and forward to client
ttsWs.on('message', (data) => {
  const response = JSON.parse(data);

  if (response.audio) {
    // Forward audio chunk to client WebSocket
    clientWs.send(JSON.stringify({
      type: 'audio_output',
      data: response.audio,  // base64 encoded
      isFinal: response.isFinal
    }));
  }
});
```

**Client Side (React PWA with MediaSource)**:
```javascript
import { useEffect, useRef } from 'react';

function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaSourceRef = useRef<MediaSource>(null);
  const sourceBufferRef = useRef<SourceBuffer>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);

  useEffect(() => {
    // Initialize MediaSource
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    audioRef.current!.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      sourceBufferRef.current = sourceBuffer;

      sourceBuffer.addEventListener('updateend', () => {
        // Append next chunk if available
        if (audioQueueRef.current.length > 0) {
          const nextChunk = audioQueueRef.current.shift()!;
          sourceBuffer.appendBuffer(nextChunk);
        }
      });
    });

    // WebSocket message handler
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'audio_output') {
        const audioData = base64ToUint8Array(msg.data);

        if (sourceBufferRef.current?.updating) {
          // Queue if buffer is busy
          audioQueueRef.current.push(audioData);
        } else {
          sourceBufferRef.current?.appendBuffer(audioData);
        }

        // Start playback once we have enough buffered
        if (audioRef.current!.paused && audioRef.current!.buffered.length > 0) {
          audioRef.current!.play();
        }
      }
    };
  }, []);

  return <audio ref={audioRef} />;
}
```

---

## 3. Barge-in and Interruption Handling

### 3.1 Voice Activity Detection (VAD)

**Client-Side VAD Implementation**:
```javascript
class VoiceActivityDetector {
  constructor(audioContext, threshold = 0.01) {
    this.audioContext = audioContext;
    this.threshold = threshold;
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  detectSpeech() {
    this.analyser.getByteTimeDomainData(this.dataArray);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / this.dataArray.length);
    return rms > this.threshold;
  }
}

// Usage
const vad = new VoiceActivityDetector(audioContext);
let speechStartTime = null;

setInterval(() => {
  const isSpeaking = vad.detectSpeech();

  if (isSpeaking && !speechStartTime) {
    speechStartTime = Date.now();
  } else if (isSpeaking && speechStartTime) {
    const duration = Date.now() - speechStartTime;

    // Trigger interrupt if user speaks for >300ms while assistant is speaking
    if (duration > 300 && isAssistantSpeaking) {
      triggerInterrupt();
    }
  } else {
    speechStartTime = null;
  }
}, 100);
```

### 3.2 Interruption Workflow

**Client Side**:
```javascript
function triggerInterrupt() {
  // 1. Send interrupt signal to server
  ws.send(JSON.stringify({ type: 'interrupt' }));

  // 2. Stop local audio playback immediately
  audioRef.current?.pause();
  audioRef.current!.currentTime = audioRef.current!.duration || 0;

  // 3. Clear any queued audio
  audioQueueRef.current = [];

  // 4. Update UI state
  setAssistantState('idle');

  // 5. Start capturing new user input
  setUserState('listening');
}
```

**Server Side**:
```javascript
ws.on('message', async (msg) => {
  const data = JSON.parse(msg);

  if (data.type === 'interrupt') {
    // 1. Cancel LLM stream
    if (llmAbortController) {
      llmAbortController.abort();
    }

    // 2. Close/flush TTS WebSocket
    if (ttsWs && ttsWs.readyState === WebSocket.OPEN) {
      ttsWs.send(JSON.stringify({ text: '', flush: true }));
      // Or close: ttsWs.close();
    }

    // 3. Update conversation context (optional)
    conversationHistory.push({
      role: 'assistant',
      content: '[Interrupted]',
      metadata: { interrupted: true }
    });

    // 4. Reset state for new input
    audioBuffer = [];
    currentTurn = null;
  }
});
```

### 3.3 False Positive Prevention

**Strategies**:
1. **Minimum duration**: Require 300-500ms of continuous speech before interrupt
2. **Confidence threshold**: Use VAD confidence scores (not just binary detection)
3. **Context awareness**: Ignore short fillers ("um", "uh") during assistant speech
4. **Prosody analysis**: Detect intentional interruptions vs. backchannel responses
5. **User preference**: Allow users to adjust interrupt sensitivity

---

## 4. Latency Optimization and Buffering Strategies

### 4.1 Target Latency Benchmarks

| Stage | Target | Excellent | Production Standard |
|-------|--------|-----------|---------------------|
| STT | <200ms | <100ms | <300ms |
| LLM | <500ms | <300ms | <800ms |
| TTS | <200ms | <100ms | <300ms |
| **Total** | **<800ms** | **<500ms** | **<1200ms** |

### 4.2 End-to-Speech Optimization

**STT Latency Reduction**:
```javascript
// Aggressive end-of-speech detection
const END_OF_SPEECH_SILENCE = 500;  // 500ms silence (down from 1000ms)
const MAX_UTTERANCE_LENGTH = 30000; // 30s max (prevents indefinite buffering)

let lastSpeechTime = Date.now();

function onAudioData(audioChunk) {
  const hasSpeech = vadDetector.detect(audioChunk);

  if (hasSpeech) {
    lastSpeechTime = Date.now();
    audioBuffer.push(audioChunk);
  } else {
    const silenceDuration = Date.now() - lastSpeechTime;

    if (silenceDuration >= END_OF_SPEECH_SILENCE ||
        audioBuffer.length * CHUNK_DURATION >= MAX_UTTERANCE_LENGTH) {
      // Send to STT immediately
      transcribeAndProcess(audioBuffer);
      audioBuffer = [];
    }
  }
}
```

### 4.3 LLM Streaming Optimization

**Chunking Strategy**:
```javascript
class LLMTextBuffer {
  constructor(minChunkSize = 50, maxChunkSize = 150) {
    this.buffer = '';
    this.minChunkSize = minChunkSize;
    this.maxChunkSize = maxChunkSize;
    this.sentenceEndRegex = /[.!?]\s+/;
  }

  addToken(token) {
    this.buffer += token;

    // Send immediately on sentence boundary (after min size)
    if (this.buffer.length >= this.minChunkSize &&
        this.sentenceEndRegex.test(this.buffer)) {
      return this.flush();
    }

    // Force send at max size
    if (this.buffer.length >= this.maxChunkSize) {
      return this.flush();
    }

    return null;
  }

  flush() {
    const chunk = this.buffer.trim();
    this.buffer = '';
    return chunk;
  }
}

// Usage in LLM stream handler
const textBuffer = new LLMTextBuffer(50, 150);

for await (const chunk of llmStream) {
  const token = chunk.choices[0]?.delta?.content;
  if (!token) continue;

  const chunkToSend = textBuffer.addToken(token);
  if (chunkToSend) {
    await sendToTTS(chunkToSend);
  }
}

// Send any remaining text
const remaining = textBuffer.flush();
if (remaining) await sendToTTS(remaining);
```

### 4.4 TTS Buffering Configuration

**Low-Latency Configuration**:
```javascript
// ElevenLabs TTS settings for <300ms latency
const ttsConfig = {
  model_id: 'eleven_flash_v2_5',  // 75ms inference
  chunk_length_schedule: [40, 80, 120],  // Very aggressive
  auto_mode: true,
  output_format: 'mp3_44100_128',  // Balance quality/size
  optimize_streaming_latency: 4,  // Max optimization (1-4)
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.0,  // Disable for speed
    use_speaker_boost: false  // Disable for speed
  }
};

// Manual flush on first chunk
ttsWs.send(JSON.stringify({
  text: firstChunk,
  flush: true  // Generate immediately, don't wait for threshold
}));
```

### 4.5 Network and Rendering Optimization

**Client-Side Buffering**:
```javascript
// Adaptive playback start threshold
const MIN_BUFFER_SECONDS = 0.3;  // 300ms minimum
const TARGET_BUFFER_SECONDS = 0.5;  // 500ms ideal

function shouldStartPlayback(audio) {
  if (audio.paused && audio.buffered.length > 0) {
    const bufferedSeconds = audio.buffered.end(0) - audio.currentTime;

    // Start playback if we have enough buffer
    if (bufferedSeconds >= MIN_BUFFER_SECONDS) {
      return true;
    }
  }
  return false;
}

// Monitor buffer health during playback
audio.addEventListener('timeupdate', () => {
  if (audio.buffered.length > 0) {
    const bufferedSeconds = audio.buffered.end(0) - audio.currentTime;

    // Warning: buffer running low
    if (bufferedSeconds < MIN_BUFFER_SECONDS) {
      console.warn('Audio buffer running low:', bufferedSeconds);
    }
  }
});
```

---

## 5. Browser Compatibility and MediaSource Extensions

### 5.1 Browser Support Matrix

| Browser | MSE Support | Audio Codecs | Notes |
|---------|-------------|--------------|-------|
| Chrome 108+ | ✅ Full | MP3, AAC, Opus | Worker support |
| Firefox 42+ | ✅ Full | fMP4/MP4 (AAC) | MP3 via polyfill |
| Safari 16+ | ✅ Full | MP4/AAC preferred | User gesture required |
| Edge 108+ | ✅ Full | MP3, AAC, Opus | Same as Chrome |
| Mobile Safari | ✅ iOS 15+ | MP4/AAC | Autoplay restrictions |

### 5.2 Production-Ready MSE Implementation

```typescript
interface AudioStreamConfig {
  mimeType: string;
  sampleRate: number;
  channels: number;
}

class AudioStreamer {
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: Uint8Array[] = [];
  private isUpdating = false;

  constructor(config: AudioStreamConfig) {
    this.audio = document.createElement('audio');
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);

    this.mediaSource.addEventListener('sourceopen', () => {
      this.initializeSourceBuffer(config);
    });
  }

  private initializeSourceBuffer(config: AudioStreamConfig) {
    try {
      // Check codec support before creating buffer
      if (!MediaSource.isTypeSupported(config.mimeType)) {
        throw new Error(`MIME type not supported: ${config.mimeType}`);
      }

      this.sourceBuffer = this.mediaSource.addSourceBuffer(config.mimeType);

      this.sourceBuffer.addEventListener('updateend', () => {
        this.isUpdating = false;
        this.processQueue();
      });

      this.sourceBuffer.addEventListener('error', (e) => {
        console.error('SourceBuffer error:', e);
      });
    } catch (error) {
      console.error('Failed to initialize SourceBuffer:', error);
      // Fallback to <audio> with blob URLs
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

      // Auto-start playback
      if (this.audio.paused && this.audio.buffered.length > 0) {
        const buffered = this.audio.buffered.end(0) - this.audio.currentTime;
        if (buffered >= 0.3) {
          this.audio.play().catch(console.error);
        }
      }
    } catch (error) {
      console.error('Error appending buffer:', error);
      this.isUpdating = false;
    }
  }

  private useFallbackPlayback() {
    // Fallback: Use Blob URLs (less efficient but more compatible)
    console.warn('Using fallback audio playback method');

    let audioBlobs: Blob[] = [];

    // Override appendAudio for fallback mode
    this.appendAudio = (chunk: Uint8Array) => {
      audioBlobs.push(new Blob([chunk], { type: 'audio/mpeg' }));

      if (audioBlobs.length === 1) {
        // First chunk - start playback
        const url = URL.createObjectURL(audioBlobs[0]);
        this.audio.src = url;
        this.audio.play().catch(console.error);
      }
    };
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

// Usage
const streamer = new AudioStreamer({
  mimeType: 'audio/mpeg',
  sampleRate: 44100,
  channels: 1
});

// Feed audio chunks
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'audio_output') {
    const audioData = base64ToUint8Array(msg.data);
    streamer.appendAudio(audioData);
  }
};
```

### 5.3 Safari-Specific Considerations

```javascript
// Safari requires user gesture for audio playback
function initializeAudioWithUserGesture() {
  const startButton = document.getElementById('start-conversation');

  startButton.addEventListener('click', async () => {
    // Initialize audio context (Safari requirement)
    const audioContext = new AudioContext();
    await audioContext.resume();

    // Initialize MediaSource after user interaction
    initializeAudioStreamer();

    // Start conversation
    startConversation();
  });
}

// Handle iOS audio session interruptions
audio.addEventListener('pause', () => {
  if (!userInitiatedPause) {
    // Phone call or system interruption
    pauseConversation();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseConversation();
  }
});
```

---

## 6. Fallback Strategies and Reliability

### 6.1 STT Fallback Cascade

```javascript
class STTService {
  constructor() {
    this.providers = [
      { name: 'elevenlabs', priority: 1, timeout: 2000 },
      { name: 'whisper', priority: 2, timeout: 3000 },
      { name: 'deepgram', priority: 3, timeout: 2000 }
    ];
  }

  async transcribe(audioBuffer) {
    const results = [];

    // Try primary provider first
    for (const provider of this.providers) {
      try {
        const result = await this.transcribeWithProvider(
          provider.name,
          audioBuffer,
          provider.timeout
        );

        if (result.confidence >= 0.8) {
          return result;
        }

        results.push(result);
      } catch (error) {
        console.error(`${provider.name} STT failed:`, error);
      }
    }

    // Return best result from any provider
    return results.sort((a, b) => b.confidence - a.confidence)[0];
  }

  async transcribeWithProvider(provider, audio, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      switch (provider) {
        case 'elevenlabs':
          return await this.transcribeElevenLabs(audio, controller.signal);
        case 'whisper':
          return await this.transcribeWhisper(audio, controller.signal);
        case 'deepgram':
          return await this.transcribeDeepgram(audio, controller.signal);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
```

### 6.2 TTS Fallback and Redundancy

```javascript
class TTSService {
  constructor() {
    this.primaryTTS = 'elevenlabs';
    this.fallbackTTS = 'openai';
    this.lastFallback = null;
  }

  async speak(text) {
    try {
      return await this.speakElevenLabs(text);
    } catch (error) {
      console.error('ElevenLabs TTS failed:', error);

      // Use fallback
      this.lastFallback = Date.now();
      return await this.speakOpenAI(text);
    }
  }

  async speakElevenLabs(text) {
    // Primary TTS implementation
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ElevenLabs TTS timeout'));
      }, 5000);

      // WebSocket implementation...
      // resolve() when audio is fully received
    });
  }

  async speakOpenAI(text) {
    // Fallback to OpenAI TTS
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text
    });

    return response.arrayBuffer();
  }
}
```

### 6.3 Network Resilience

```javascript
class ResilientWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;

      // Send queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.ws.send(msg);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.attemptReconnect();
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      // Notify user to refresh
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      // Queue for when connection is restored
      this.messageQueue.push(data);
    }
  }
}
```

### 6.4 Error Handling and User Communication

```javascript
class VoiceAssistantErrorHandler {
  constructor(uiController) {
    this.ui = uiController;
    this.errorCounts = {};
  }

  handleError(error, context) {
    // Log for monitoring
    console.error(`Error in ${context}:`, error);

    // Track error frequency
    this.errorCounts[context] = (this.errorCounts[context] || 0) + 1;

    // User-facing messages
    switch (context) {
      case 'stt':
        if (this.errorCounts.stt < 3) {
          this.ui.showMessage('Sorry, I didn\'t catch that. Could you repeat?');
        } else {
          this.ui.showMessage('I\'m having trouble hearing you. Let\'s try typing instead.');
          this.ui.showTextInput();
        }
        break;

      case 'llm':
        this.ui.showMessage('I\'m having trouble thinking right now. Let me try again...');
        // Retry with simpler prompt
        break;

      case 'tts':
        // Show text response even if audio fails
        this.ui.showTextResponse(context.text);
        this.ui.showMessage('(Audio unavailable - showing text response)');
        break;

      case 'network':
        this.ui.showMessage('Connection issue detected. Reconnecting...');
        break;

      default:
        this.ui.showMessage('Something went wrong. Please try again.');
    }
  }

  reset() {
    this.errorCounts = {};
  }
}
```

---

## 7. UI State Management and User Experience

### 7.1 Conversation States

```typescript
enum ConversationState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
  INTERRUPTED = 'interrupted',
  ERROR = 'error'
}

interface ConversationContext {
  state: ConversationState;
  transcript: string;
  response: string;
  audioPlaying: boolean;
  userId: string;
  sessionId: string;
}
```

### 7.2 React Component Structure

```typescript
import { useState, useEffect, useRef } from 'react';

function VoiceAssistant() {
  const [state, setState] = useState<ConversationState>(ConversationState.IDLE);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const wsRef = useRef<ResilientWebSocket | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);

  useEffect(() => {
    // Initialize WebSocket
    wsRef.current = new ResilientWebSocket('wss://your-server.com/voice');

    wsRef.current.ws.onmessage = handleWebSocketMessage;

    return () => {
      wsRef.current?.ws.close();
      audioStreamerRef.current?.destroy();
    };
  }, []);

  const handleWebSocketMessage = (event: MessageEvent) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'stt_result':
        setTranscript(msg.text);
        setState(ConversationState.PROCESSING);
        break;

      case 'llm_token':
        setResponse((prev) => prev + msg.token);
        break;

      case 'audio_output':
        if (state !== ConversationState.SPEAKING) {
          setState(ConversationState.SPEAKING);
        }

        const audioData = base64ToUint8Array(msg.data);
        audioStreamerRef.current?.appendAudio(audioData);
        break;

      case 'speaking_complete':
        setState(ConversationState.IDLE);
        setResponse('');
        break;

      case 'error':
        setState(ConversationState.ERROR);
        console.error('Server error:', msg.error);
        break;
    }
  };

  const startListening = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setIsRecording(true);
    setState(ConversationState.LISTENING);

    // Initialize VAD for interruption detection
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    vadRef.current = new VoiceActivityDetector(audioContext);
    source.connect(vadRef.current.analyser);

    // Start streaming audio to server
    startAudioCapture(stream);
  };

  const stopListening = () => {
    setIsRecording(false);
    // Signal end of utterance to server
    wsRef.current?.send(JSON.stringify({ type: 'end_utterance' }));
  };

  const handleInterrupt = () => {
    wsRef.current?.send(JSON.stringify({ type: 'interrupt' }));
    audioStreamerRef.current?.stop();
    setState(ConversationState.IDLE);
    setResponse('');
  };

  return (
    <div className="voice-assistant">
      <StatusIndicator state={state} />

      <TranscriptDisplay text={transcript} />

      <ResponseDisplay
        text={response}
        isStreaming={state === ConversationState.SPEAKING}
      />

      <Controls
        isRecording={isRecording}
        onStartListening={startListening}
        onStopListening={stopListening}
        onInterrupt={handleInterrupt}
        disabled={state === ConversationState.ERROR}
      />
    </div>
  );
}
```

### 7.3 Visual Feedback Components

```typescript
function StatusIndicator({ state }: { state: ConversationState }) {
  const statusConfig = {
    [ConversationState.IDLE]: {
      icon: '⚪',
      text: 'Ready to listen',
      color: 'text-gray-400'
    },
    [ConversationState.LISTENING]: {
      icon: '🎤',
      text: 'Listening...',
      color: 'text-blue-500',
      animate: true
    },
    [ConversationState.PROCESSING]: {
      icon: '🤔',
      text: 'Thinking...',
      color: 'text-yellow-500',
      animate: true
    },
    [ConversationState.SPEAKING]: {
      icon: '🔊',
      text: 'Speaking...',
      color: 'text-green-500',
      animate: true
    },
    [ConversationState.ERROR]: {
      icon: '⚠️',
      text: 'Error occurred',
      color: 'text-red-500'
    }
  };

  const config = statusConfig[state];

  return (
    <div className={`flex items-center gap-2 ${config.color}`}>
      <span className={config.animate ? 'animate-pulse' : ''}>
        {config.icon}
      </span>
      <span>{config.text}</span>
    </div>
  );
}

function WaveformVisualizer({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Animated waveform visualization
    const draw = () => {
      // Draw waveform bars
      // ... implementation
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return <canvas ref={canvasRef} width={300} height={100} />;
}
```

---

## 8. Performance Monitoring and Metrics

### 8.1 Latency Tracking

```javascript
class PerformanceTracker {
  constructor() {
    this.metrics = {
      stt: [],
      llm: [],
      tts: [],
      total: []
    };
    this.currentTurn = null;
  }

  startTurn() {
    this.currentTurn = {
      id: Date.now(),
      userSpeechStart: performance.now(),
      userSpeechEnd: null,
      sttStart: null,
      sttEnd: null,
      llmStart: null,
      llmFirstToken: null,
      llmEnd: null,
      ttsStart: null,
      ttsFirstAudio: null,
      ttsEnd: null,
      audioPlayStart: null
    };
  }

  markEvent(event) {
    if (!this.currentTurn) return;
    this.currentTurn[event] = performance.now();
  }

  endTurn() {
    if (!this.currentTurn) return;

    const turn = this.currentTurn;

    const metrics = {
      sttLatency: turn.sttEnd - turn.sttStart,
      llmFirstTokenLatency: turn.llmFirstToken - turn.llmStart,
      llmTotalLatency: turn.llmEnd - turn.llmStart,
      ttsLatency: turn.ttsFirstAudio - turn.ttsStart,
      timeToFirstAudio: turn.audioPlayStart - turn.userSpeechEnd,
      totalLatency: turn.audioPlayStart - turn.userSpeechEnd
    };

    // Store metrics
    this.metrics.stt.push(metrics.sttLatency);
    this.metrics.llm.push(metrics.llmTotalLatency);
    this.metrics.tts.push(metrics.ttsLatency);
    this.metrics.total.push(metrics.totalLatency);

    // Log for monitoring
    console.log('Turn metrics:', metrics);

    // Send to analytics
    this.sendToAnalytics(metrics);

    this.currentTurn = null;
  }

  getAverages() {
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      stt: avg(this.metrics.stt),
      llm: avg(this.metrics.llm),
      tts: avg(this.metrics.tts),
      total: avg(this.metrics.total)
    };
  }
}
```

### 8.2 Error Rate Monitoring

```javascript
class ErrorMonitor {
  constructor() {
    this.errors = {
      stt: 0,
      llm: 0,
      tts: 0,
      network: 0
    };
    this.totalRequests = 0;
  }

  logError(type, error) {
    this.errors[type]++;

    // Alert if error rate > 10%
    const errorRate = this.errors[type] / this.totalRequests;
    if (errorRate > 0.1) {
      this.alertHighErrorRate(type, errorRate);
    }
  }

  getErrorRates() {
    return Object.entries(this.errors).reduce((acc, [type, count]) => {
      acc[type] = count / this.totalRequests;
      return acc;
    }, {});
  }
}
```

---

## 9. Production Deployment Checklist

### 9.1 Infrastructure Requirements

- [ ] **WebSocket Server**: Node.js with clustering for scalability
- [ ] **Load Balancer**: Sticky sessions for WebSocket connections
- [ ] **Redis**: Session state management across servers
- [ ] **CDN**: Static assets and audio file caching
- [ ] **Monitoring**: Datadog/New Relic for latency tracking
- [ ] **Error Tracking**: Sentry for client and server errors
- [ ] **Rate Limiting**: Per-user limits for API abuse prevention

### 9.2 Security Considerations

- [ ] **Authentication**: JWT or session-based auth for WebSocket connections
- [ ] **CORS Configuration**: Proper CORS headers for production domains
- [ ] **Rate Limiting**: Prevent abuse of STT/LLM/TTS APIs
- [ ] **Input Validation**: Sanitize all user inputs and audio metadata
- [ ] **API Key Management**: Secure storage of ElevenLabs/OpenAI keys
- [ ] **Audio Storage**: Optional encrypted storage for audit/training
- [ ] **Privacy Compliance**: GDPR/CCPA compliance for voice data

### 9.3 Cost Optimization

```javascript
// Cost tracking and limits
class CostController {
  constructor(budget) {
    this.budget = budget;
    this.costs = {
      stt: { perMinute: 0.006, usage: 0 },  // ElevenLabs pricing
      llm: { perToken: 0.00001, usage: 0 },  // GPT-5 pricing
      tts: { perChar: 0.00003, usage: 0 }   // ElevenLabs pricing
    };
  }

  trackUsage(service, amount) {
    this.costs[service].usage += amount;
  }

  getTotalCost() {
    return Object.entries(this.costs).reduce((total, [_, data]) => {
      return total + (data.usage * data.perMinute || data.perToken || data.perChar);
    }, 0);
  }

  isWithinBudget() {
    return this.getTotalCost() < this.budget;
  }
}
```

---

## 10. Summary and Recommendations

### 10.1 Critical Implementation Path

1. **Immediate**: Use **Deepgram** or **Whisper** for streaming STT (ElevenLabs Scribe not streaming yet)
2. **TTS**: Use **ElevenLabs WebSocket TTS** with `eleven_flash_v2_5` model for optimal latency
3. **LLM**: Implement **OpenAI GPT streaming** with proper function calling handling
4. **Barge-in**: Implement **VAD-based interruption** with 300-500ms threshold
5. **Browser**: Use **MediaSource Extensions** with MP3 audio format for broad compatibility

### 10.2 Performance Targets

| Metric | Target | Implementation Priority |
|--------|--------|------------------------|
| Time-to-first-audio | <800ms | 🔴 Critical |
| STT latency | <300ms | 🔴 Critical |
| LLM first token | <500ms | 🟡 High |
| TTS latency | <200ms | 🔴 Critical |
| Barge-in detection | <300ms | 🟡 High |
| Error rate | <5% | 🟢 Medium |

### 10.3 Technology Stack Recommendation

```yaml
Client (React PWA):
  Framework: React 19 + TypeScript
  Audio: MediaSource Extensions API
  WebSocket: Native WebSocket with reconnection logic
  State: Zustand or Context API
  Recording: Web Audio API with AudioWorklet
  VAD: Custom implementation or WebRTC VAD

Server (Node.js):
  Runtime: Node.js 20+ with clustering
  Framework: Fastify or Express
  WebSocket: ws library
  Session: Redis for state management
  Queue: Bull/BullMQ for job processing (optional)

APIs:
  STT: Deepgram (streaming) + ElevenLabs Scribe (when available)
  LLM: OpenAI GPT-5 with streaming
  TTS: ElevenLabs WebSocket TTS (eleven_flash_v2_5)
  Fallbacks: OpenAI Whisper (STT), OpenAI TTS (TTS)

Infrastructure:
  Hosting: Vercel (client) + AWS/GCP (server)
  Load Balancer: nginx or AWS ALB (sticky sessions)
  Monitoring: Datadog + Sentry
  Storage: S3 (optional audio storage)
```

### 10.4 Timeline Considerations

**ElevenLabs STT Streaming**: Expected "in coming weeks" (as of March 2025)
- **Plan A**: Launch with Deepgram/Whisper streaming STT
- **Plan B**: Monitor ElevenLabs releases and migrate when available
- **Hybrid**: Run both in parallel, compare accuracy/latency

**OpenAI Realtime API**: Consider as alternative to cascaded pipeline
- **Pros**: Native speech-to-speech, built-in interruption, lower latency
- **Cons**: Less control, limited tool use compared to GPT-5 text mode
- **Recommendation**: Evaluate for specific use cases, cascaded pipeline still preferred for complex tool use

---

## 11. References and Further Reading

### Official Documentation
- [ElevenLabs TTS WebSocket API](https://elevenlabs.io/docs/websockets)
- [ElevenLabs Speech-to-Text (Scribe)](https://elevenlabs.io/docs/capabilities/speech-to-text)
- [OpenAI Streaming API](https://platform.openai.com/docs/api-reference/streaming)
- [MDN MediaSource Extensions](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API)
- [W3C Media Source Extensions Specification](https://www.w3.org/TR/media-source-2/)

### Technical Guides
- [Deepgram: Low Latency Voice AI Guide](https://deepgram.com/learn/low-latency-voice-ai)
- [LiveKit: Turn Detection and Interruptions](https://docs.livekit.io/agents/build/turns/)
- [Modal Blog: One-Second Voice-to-Voice Latency](https://modal.com/blog/low-latency-voice-bot)

### Architecture Comparisons
- [Real-Time vs Turn-Based Voice Agent Architecture](https://softcery.com/lab/ai-voice-agents-real-time-vs-turn-based-tts-stt-architecture)
- [Voice AI Architectures: Pipelines to Speech-to-Speech](https://medium.com/@ggarciabernardo/voice-ai-architectures-from-traditional-pipelines-to-speech-to-speech-and-hybrid-approaches-645b671d41ec)

### Implementation Examples
- [Pipecat.ai ElevenLabs Integration](https://docs.pipecat.ai/server/services/tts/elevenlabs)
- [Supabase: Streaming Speech with ElevenLabs](https://supabase.com/docs/guides/functions/examples/elevenlabs-generate-speech-stream)

---

## Appendix A: Code Samples Repository Structure

```
voice-assistant-elevenlabs/
├── client/                  # React PWA
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceAssistant.tsx
│   │   │   ├── AudioStreamer.ts
│   │   │   ├── VoiceActivityDetector.ts
│   │   │   └── StatusIndicator.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useAudioPlayback.ts
│   │   └── utils/
│   │       ├── audio.ts
│   │       └── base64.ts
│   └── public/
│       └── audio-processor.js  # AudioWorklet
├── server/                  # Node.js WebSocket server
│   ├── src/
│   │   ├── services/
│   │   │   ├── STTService.ts
│   │   │   ├── LLMService.ts
│   │   │   ├── TTSService.ts
│   │   │   └── FallbackService.ts
│   │   ├── websocket/
│   │   │   ├── handler.ts
│   │   │   └── session.ts
│   │   ├── monitoring/
│   │   │   ├── metrics.ts
│   │   │   └── errors.ts
│   │   └── index.ts
│   └── package.json
├── docs/
│   └── architecture.md
└── README.md
```

---

## Appendix B: Glossary of Terms

- **VAD (Voice Activity Detection)**: Algorithm to detect presence of human speech in audio signal
- **MSE (MediaSource Extensions)**: Browser API for streaming media playback
- **Barge-in**: User interrupting assistant's speech mid-response
- **RTF (Real-Time Factor)**: Processing speed relative to input duration (0.5 = 2x faster than real-time)
- **WER (Word Error Rate)**: Percentage of transcription errors
- **Chunk Length Schedule**: ElevenLabs TTS parameter controlling text buffering thresholds
- **End-of-Speech Detection**: Algorithm to determine when user has finished speaking
- **Source Buffer**: MediaSource API component for managing media data
- **Turn Detection**: Determining when conversation turn should switch between user and assistant
- **Streaming Completion**: Incremental LLM token generation (vs. waiting for full response)

---

**Document Version**: 1.0
**Last Updated**: November 10, 2025
**Next Review**: When ElevenLabs releases streaming STT API

---

*Generated by Claude (Sonnet 4.5) using SuperClaude Deep Research Framework*
