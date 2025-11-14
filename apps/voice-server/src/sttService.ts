/**
 * Speech-to-Text (STT) Service - Deepgram Integration
 *
 * Provides streaming speech transcription using Deepgram Nova-2 model.
 * Supports real-time transcription with <200ms latency.
 *
 * Features:
 * - Deepgram Nova-2 model (high accuracy, 99 languages)
 * - Smart formatting and punctuation
 * - Automatic language detection (optional)
 * - Fallback to Whisper API (if needed)
 *
 * Usage:
 * ```typescript
 * const stt = new STTService();
 * const transcript = await stt.transcribe(audioBuffer);
 * ```
 */

import { createClient } from '@deepgram/sdk';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

export class STTService {
  private deepgram: ReturnType<typeof createClient>;
  private apiKey: string;
  private openai?: OpenAI;

  constructor() {
    this.apiKey = process.env['DEEPGRAM_API_KEY'] || '';

    if (!this.apiKey) {
      console.warn('[STTService] DEEPGRAM_API_KEY not configured');
    }

    this.deepgram = createClient(this.apiKey);

    const openaiKey = process.env['OPENAI_API_KEY'];
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    } else {
      console.warn('[STTService] OPENAI_API_KEY not set. Falling back to Deepgram only.');
    }
  }

  /**
   * Transcribe audio buffer (prerecorded mode)
   * Used for end-of-utterance transcription after buffering
   */
  async transcribe(audio: Uint8Array): Promise<string | null> {
    try {
      const openaiTranscript = await this.tryOpenAITranscription(audio);
      if (openaiTranscript) {
        return openaiTranscript;
      }
    } catch (error) {
      console.warn('[STTService] OpenAI transcription failed, falling back to Deepgram:', error);
    }

    if (!this.apiKey) {
      throw new Error('DEEPGRAM_API_KEY not configured');
    }

    const { result } = await this.deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audio),
      {
        model: 'nova-2',
        smart_format: true, // Auto-format text (dates, numbers, etc.)
        punctuate: true, // Add punctuation
        language: 'en', // Or 'auto' for detection
      }
    );

    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript || transcript.trim().length === 0) {
      console.warn('[STTService] No speech detected in audio');
      return null;
    }

    return transcript.trim();
  }

  /**
   * Create streaming transcription connection (for future implementation)
   * Currently using batch transcription for simplicity
   */
  async createStreamingConnection(
    onTranscript: (text: string) => void,
    onError: (error: Error) => void
  ) {
    try {
      const connection = this.deepgram.listen.live({
        model: 'nova-2',
        smart_format: true,
        punctuate: true,
        interim_results: true, // Get partial results
        endpointing: 500, // 500ms silence = end of utterance
      });

      connection.on('open', () => {
        console.log('[STTService] Streaming connection opened');
      });

      connection.on('Results', (data: any) => {
        const transcript = data?.channel?.alternatives?.[0]?.transcript;

        if (transcript && transcript.trim().length > 0) {
          onTranscript(transcript.trim());
        }
      });

      connection.on('error', (error: Error) => {
        console.error('[STTService] Streaming error:', error);
        onError(error);
      });

      connection.on('close', () => {
        console.log('[STTService] Streaming connection closed');
      });

      return connection;
    } catch (error) {
      console.error('[STTService] Failed to create streaming connection:', error);
      onError(error as Error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // No persistent connections in batch mode
  }

  private async tryOpenAITranscription(audio: Uint8Array): Promise<string | null> {
    if (!this.openai) {
      return null;
    }

    const file = await toFile(Buffer.from(audio), 'utterance.wav');
    const transcription = await this.openai.audio.transcriptions.create({
      file,
      model: 'gpt-4o-mini-transcribe',
      language: 'en',
    });

    const text = transcription.text?.trim();
    return text && text.length > 0 ? text : null;
  }
}
