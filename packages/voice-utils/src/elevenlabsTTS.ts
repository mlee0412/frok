import WebSocket, { RawData } from 'ws';
import type OpenAI from 'openai';

export interface ElevenLabsTTSOptions {
  apiKey?: string;
  voiceId?: string;
  modelId?: string;
  chunkSchedule?: number[];
  fallbackClient?: OpenAI;
  fallbackVoice?: string;
  fallbackModel?: string;
}

type ResolveReject = {
  resolve: () => void;
  reject: (error: Error) => void;
};

/**
 * Shared ElevenLabs streaming TTS helper that waits for the socket to be ready
 * before sending payloads and optionally falls back to OpenAI TTS.
 */
export class ElevenLabsTTSService {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private connectCallbacks: ResolveReject | null = null;

  private readonly apiKey?: string;
  private readonly voiceId: string;
  private readonly modelId: string;
  private readonly chunkSchedule: number[];
  private readonly fallbackClient?: OpenAI;
  private readonly fallbackVoice: string;
  private readonly fallbackModel: string;

  constructor(options: ElevenLabsTTSOptions = {}) {
    this.apiKey = options.apiKey ?? process.env['ELEVENLABS_API_KEY'];
    this.voiceId = options.voiceId ?? process.env['ELEVENLABS_VOICE_ID'] ?? 'EXAVITQu4vr4xnSDxMaL';
    this.modelId = options.modelId ?? 'eleven_flash_v2_5';
    this.chunkSchedule = options.chunkSchedule ?? [50, 100, 150];
    this.fallbackClient = options.fallbackClient;
    this.fallbackVoice = options.fallbackVoice ?? 'alloy';
    this.fallbackModel = options.fallbackModel ?? 'gpt-4o-mini-tts';

    if (!this.apiKey) {
      console.warn('[ElevenLabsTTS] ELEVENLABS_API_KEY not configured. Falling back to OpenAI TTS when available.');
    }
  }

  async synthesize(text: string, onAudioChunk: (chunk: Buffer) => void): Promise<void> {
    if (!this.apiKey) {
      await this.synthesizeWithFallback(text, onAudioChunk);
      return;
    }

    await this.ensureConnection();

    const socket = this.ws;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('TTS socket is not ready');
    }

    await new Promise<void>((resolve, reject) => {
      const messageHandler = (data: RawData) => {
        try {
          const payload = JSON.parse(data.toString());

          if (payload.audio) {
            onAudioChunk(Buffer.from(payload.audio, 'base64'));
          }

          if (payload.isFinal) {
            cleanup();
            resolve();
          }

          if (payload.error) {
            cleanup();
            reject(new Error(payload.error));
          }
        } catch (error) {
          console.error('[ElevenLabsTTS] Failed to parse payload:', error);
        }
      };

      const errorHandler = (error: unknown) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const closeHandler = () => {
        cleanup();
        reject(new Error('TTS socket closed unexpectedly'));
      };

      const cleanup = () => {
        socket.off('message', messageHandler);
        socket.off('error', errorHandler as any);
        socket.off('close', closeHandler);
      };

      socket.on('message', messageHandler);
      socket.once('error', errorHandler as any);
      socket.once('close', closeHandler);

      socket.send(
        JSON.stringify({
          text,
          flush: true,
        })
      );
    });
  }

  async stop(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text: '', flush: true }));
    }
  }

  cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connectPromise = null;
      this.connectCallbacks = null;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectCallbacks = { resolve, reject };
      this.initializeSocket();
    });

    return this.connectPromise;
  }

  private initializeSocket() {
    if (!this.apiKey) {
      this.connectCallbacks?.reject(new Error('ELEVENLABS_API_KEY not configured'));
      this.connectPromise = null;
      this.connectCallbacks = null;
      return;
    }

    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input`;
    const socket = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    this.ws = socket;

    socket.once('open', () => {
      socket.send(
        JSON.stringify({
          text: ' ',
          model_id: this.modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          chunk_length_schedule: this.chunkSchedule,
          auto_mode: true,
        })
      );

      this.connectCallbacks?.resolve();
      this.connectPromise = null;
      this.connectCallbacks = null;
    });

    socket.once('error', (error: unknown) => {
      this.connectCallbacks?.reject(error instanceof Error ? error : new Error(String(error)));
      this.connectPromise = null;
      this.connectCallbacks = null;
    });

    socket.on('close', () => {
      this.connectPromise = null;
      this.connectCallbacks = null;
    });
  }

  private async synthesizeWithFallback(text: string, onAudioChunk: (chunk: Buffer) => void) {
    if (!this.fallbackClient) {
      throw new Error('ElevenLabs unavailable and no OpenAI fallback configured');
    }

    const response = await this.fallbackClient.audio.speech.create({
      model: this.fallbackModel,
      voice: this.fallbackVoice,
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    onAudioChunk(buffer);
  }
}
