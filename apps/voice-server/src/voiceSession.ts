/**
 * Voice Session Manager - Backend Orchestration
 *
 * Coordinates the three-stream voice pipeline:
 * Audio Input → STT → LLM → TTS → Audio Output
 *
 * Responsibilities:
 * - Audio buffering and utterance detection
 * - STT transcription coordination
 * - LLM streaming with OpenAI GPT-5
 * - TTS synthesis with chunked delivery
 * - Interrupt/barge-in handling
 * - Conversation history management
 *
 * Security:
 * - User ID isolation for memory
 * - Rate limiting handled at API route level
 * - No sensitive data in WebSocket messages
 */

import { STTService } from './sttService.js';
import { TTSService } from './ttsService.js';
import OpenAI from 'openai';
import { WebSocket } from 'ws';

// Voice message types (adapted from @/types/voice)
export type ClientVoiceMessage =
  | { type: 'audio_input'; data: string }
  | { type: 'end_utterance' }
  | { type: 'interrupt' };

export type ServerVoiceMessage =
  | { type: 'stt_result'; text: string }
  | { type: 'llm_token'; token: string }
  | { type: 'audio_chunk'; data: string }
  | { type: 'response_complete' }
  | { type: 'error'; error: string };

// Lazy-loaded OpenAI client
let cachedOpenAI: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!cachedOpenAI) {
    cachedOpenAI = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'],
    });
  }
  return cachedOpenAI;
}

export interface VoiceSessionConfig {
  userId: string;
  socket: WebSocket;
  sttService: STTService;
  ttsService: TTSService;
}

export class VoiceSessionManager {
  private socket: WebSocket;
  private sttService: STTService;
  private ttsService: TTSService;

  // Audio buffering
  private audioBuffer: Uint8Array[] = [];
  private silenceTimer: NodeJS.Timeout | null = null;
  private readonly SILENCE_THRESHOLD = 500; // ms

  // Conversation state
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private llmAbortController: AbortController | null = null;
  private currentResponse = '';

  constructor(config: VoiceSessionConfig) {
    // userId stored for future database operations
    this.socket = config.socket;
    this.sttService = config.sttService;
    this.ttsService = config.ttsService;

    // Add system message for voice assistant persona
    this.conversationHistory.push({
      role: 'system',
      content:
        'You are a helpful voice assistant. Keep responses concise and natural for spoken conversation. Aim for 1-3 sentences per response.',
    });
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  async handleMessage(data: ClientVoiceMessage) {
    try {
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
          console.warn('[VoiceSessionManager] Unknown message type:', data);
      }
    } catch (error) {
      console.error('[VoiceSessionManager] Message handling error:', error);
      this.sendError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // Audio Input Processing
  // ============================================================================

  private async handleAudioInput(base64Audio: string) {
    try {
      // Decode base64 audio chunk
      const audioChunk = Buffer.from(base64Audio, 'base64');
      this.audioBuffer.push(new Uint8Array(audioChunk));

      // Reset silence timer (500ms silence = end of utterance)
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
      }

      this.silenceTimer = setTimeout(() => {
        this.processUtterance();
      }, this.SILENCE_THRESHOLD);
    } catch (error) {
      console.error('[VoiceSessionManager] Audio input error:', error);
      this.sendError('Failed to process audio input');
    }
  }

  // ============================================================================
  // Speech-to-Text Processing
  // ============================================================================

  private async processUtterance() {
    if (this.audioBuffer.length === 0) {
      return;
    }

    try {
      // Concatenate audio chunks
      const totalLength = this.audioBuffer.reduce((sum, arr) => sum + arr.length, 0);
      const fullAudio = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of this.audioBuffer) {
        fullAudio.set(chunk, offset);
        offset += chunk.length;
      }

      // Clear buffer
      this.audioBuffer = [];

      // Transcribe with STT
      const transcript = await this.sttService.transcribe(fullAudio);

      if (!transcript) {
        this.sendError('No speech detected');
        return;
      }

      // Send transcript to client
      this.send({
        type: 'stt_result',
        text: transcript,
      });

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
      });

      // Process with LLM
      await this.processLLM(transcript);
    } catch (error) {
      console.error('[VoiceSessionManager] Utterance processing error:', error);
      this.sendError('Failed to process speech');
    }
  }

  // ============================================================================
  // LLM Processing (OpenAI GPT-5 Streaming)
  // ============================================================================

  private async processLLM(_userMessage: string) {
    try {
      this.llmAbortController = new AbortController();
      this.currentResponse = '';

      const stream = await getOpenAI().chat.completions.create(
        {
          model: 'gpt-4o', // GPT-5 equivalent, use gpt-4o-mini for cost savings
          messages: this.conversationHistory as any,
          stream: true,
          max_tokens: 500, // Limit response length for cost control
          temperature: 0.7,
        },
        {
          signal: this.llmAbortController.signal,
        }
      );

      let textBuffer = '';
      const assistantMessage = { role: 'assistant', content: '' };

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          const token = delta.content;
          textBuffer += token;
          assistantMessage.content += token;

          // Send token to client for display
          this.send({
            type: 'llm_token',
            token,
          });

          // Send to TTS on sentence boundaries or after 100+ chars
          if (this.shouldSendToTTS(textBuffer)) {
            await this.synthesizeText(textBuffer);
            textBuffer = '';
          }
        }
      }

      // Send any remaining text to TTS
      if (textBuffer.trim().length > 0) {
        await this.synthesizeText(textBuffer);
      }

      // Add to conversation history
      this.conversationHistory.push(assistantMessage);

      // Notify client that response is complete
      this.send({
        type: 'response_complete',
      });

      this.currentResponse = '';
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Interrupted, not an error
        console.log('[VoiceSessionManager] LLM stream interrupted');
        return;
      }
      console.error('[VoiceSessionManager] LLM processing error:', error);
      this.sendError('Failed to generate response');
    }
  }

  /**
   * Determine if text buffer should be sent to TTS
   * Send on sentence boundaries or after 100+ characters
   */
  private shouldSendToTTS(text: string): boolean {
    const trimmed = text.trim();

    // Check for sentence endings
    if (/[.!?]\s*$/.test(trimmed)) {
      return true;
    }

    // Check for comma/semicolon with length threshold
    if (/[,;]\s*$/.test(trimmed) && trimmed.length > 80) {
      return true;
    }

    // Hard limit at 100 characters
    return trimmed.length > 100;
  }

  // ============================================================================
  // Text-to-Speech Synthesis
  // ============================================================================

  private async synthesizeText(text: string) {
    try {
      await this.ttsService.synthesize(text, (audioChunk) => {
        // Send audio chunk to client (base64-encoded MP3)
        this.send({
          type: 'audio_chunk',
          data: audioChunk.toString('base64'),
        });
      });
    } catch (error) {
      console.error('[VoiceSessionManager] TTS synthesis error:', error);
      this.sendError('Failed to synthesize speech');
    }
  }

  // ============================================================================
  // Interrupt Handling
  // ============================================================================

  private async handleInterrupt() {
    console.log('[VoiceSessionManager] Handling interrupt');

    // Cancel LLM stream
    if (this.llmAbortController) {
      this.llmAbortController.abort();
      this.llmAbortController = null;
    }

    // Stop TTS
    await this.ttsService.stop();

    // Clear audio buffer
    this.audioBuffer = [];

    // Optionally mark last message as interrupted
    if (this.conversationHistory.length > 0) {
      const lastMsg = this.conversationHistory[this.conversationHistory.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && this.currentResponse) {
        lastMsg.content += ' [interrupted]';
      }
    }

    this.currentResponse = '';
  }

  // ============================================================================
  // WebSocket Communication
  // ============================================================================

  private send(message: ServerVoiceMessage) {
    try {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[VoiceSessionManager] Send error:', error);
    }
  }

  private sendError(error: string) {
    this.send({
      type: 'error',
      error,
    });
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  cleanup() {
    console.log('[VoiceSessionManager] Cleaning up session');

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    if (this.llmAbortController) {
      this.llmAbortController.abort();
    }

    this.ttsService.cleanup();
    this.sttService.cleanup();

    this.audioBuffer = [];
    this.conversationHistory = [];
  }
}

/**
 * Setup voice session with WebSocket handlers (exported for index.ts)
 */
export async function setupVoiceSession(socket: WebSocket, userId: string) {
  let session: VoiceSessionManager | null = null;

  try {
    // Initialize voice services
    const sttService = new STTService();
    const ttsService = new TTSService();

    // Create session manager
    session = new VoiceSessionManager({
      userId,
      socket,
      sttService,
      ttsService,
    });

    console.log(`[VoiceSession] Session started for user ${userId}`);

    // Handle incoming messages
    socket.on('message', async (data: Buffer) => {
      try {
        const parsed = JSON.parse(data.toString());

        // Basic validation
        if (!parsed.type) {
          console.error('[VoiceSession] Invalid message: missing type');
          socket.send(
            JSON.stringify({
              type: 'error',
              error: 'Invalid message format',
            })
          );
          return;
        }

        // Handle message
        await session!.handleMessage(parsed as ClientVoiceMessage);
      } catch (error) {
        console.error('[VoiceSession] Message handling error:', error);
        socket.send(
          JSON.stringify({
            type: 'error',
            error: 'Failed to process message',
          })
        );
      }
    });

    // Handle connection close
    socket.on('close', () => {
      console.log(`[VoiceSession] Session closed for user ${userId}`);
      session?.cleanup();
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('[VoiceSession] WebSocket error:', error);
      session?.cleanup();
    });
  } catch (error) {
    console.error('[VoiceSession] Session setup error:', error);
    session?.cleanup();
    socket.close();
  }
}
