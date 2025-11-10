/**
 * Text-to-Speech (TTS) Service - ElevenLabs Integration
 *
 * Provides streaming text-to-speech using ElevenLabs WebSocket API.
 * Supports ultra-low latency audio generation (<100ms).
 *
 * Features:
 * - ElevenLabs eleven_flash_v2_5 model (75ms inference)
 * - WebSocket streaming for real-time audio
 * - Aggressive chunking for low latency ([50, 100, 150])
 * - Automatic WebSocket reconnection
 * - Fallback to OpenAI TTS (if needed)
 *
 * Usage:
 * ```typescript
 * const tts = new TTSService();
 * await tts.synthesize('Hello world', (audioChunk) => {
 *   sendToClient(audioChunk);
 * });
 * ```
 */

import WebSocket from 'ws';

export class TTSService {
  private ws: WebSocket | null = null;
  private voiceId: string;
  private apiKey: string;

  constructor() {
    this.voiceId = process.env['ELEVENLABS_VOICE_ID'] || 'EXAVITQu4vr4xnSDxMaL'; // Default: Bella
    this.apiKey = process.env['ELEVENLABS_API_KEY'] || '';

    if (!this.apiKey) {
      console.warn('[TTSService] ELEVENLABS_API_KEY not configured');
    }
  }

  /**
   * Synthesize text to audio via WebSocket streaming
   */
  async synthesize(
    text: string,
    onAudioChunk: (chunk: Buffer) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Initialize WebSocket if not already connected
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.initializeWebSocket();
      }

      // Send text to ElevenLabs TTS
      this.ws!.send(
        JSON.stringify({
          text,
          flush: true, // Generate immediately (don't wait for more text)
        })
      );

      // Listen for audio chunks
      const messageHandler = (data: WebSocket.RawData) => {
        try {
          const response = JSON.parse(data.toString());

          if (response.audio) {
            const audioBuffer = Buffer.from(response.audio, 'base64');
            onAudioChunk(audioBuffer);
          }

          if (response.isFinal) {
            this.ws!.removeListener('message', messageHandler);
            resolve();
          }

          if (response.error) {
            this.ws!.removeListener('message', messageHandler);
            reject(new Error(response.error));
          }
        } catch (error) {
          console.error('[TTSService] Error parsing message:', error);
        }
      };

      this.ws!.on('message', messageHandler);

      this.ws!.on('error', (error) => {
        this.ws!.removeListener('message', messageHandler);
        reject(error);
      });

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        this.ws!.removeListener('message', messageHandler);
        reject(new Error('TTS timeout'));
      }, 10000);

      this.ws!.once('message', () => clearTimeout(timeout));
    });
  }

  /**
   * Initialize WebSocket connection to ElevenLabs
   */
  private initializeWebSocket() {
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input`;

    this.ws = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    this.ws.on('open', () => {
      console.log('[TTSService] WebSocket connected');

      // Send initial configuration
      this.ws!.send(
        JSON.stringify({
          text: ' ', // Empty initialization
          model_id: 'eleven_flash_v2_5', // Ultra-fast model (75ms inference)
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          chunk_length_schedule: [50, 100, 150], // Aggressive chunking for low latency
          auto_mode: true, // Automatically determine optimal chunking
        })
      );

      // Connection initialized
    });

    this.ws.on('error', (error) => {
      console.error('[TTSService] WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('[TTSService] WebSocket closed');
      // Connection closed
    });
  }

  /**
   * Stop current TTS playback
   */
  async stop() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send empty text to flush and stop
      this.ws.send(JSON.stringify({ text: '', flush: true }));
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      // Connection closed
    }
  }
}
