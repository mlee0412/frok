/**
 * Voice Agent Integration for OpenAI Agents SDK
 *
 * Enables hands-free voice interactions using OpenAI's VoicePipeline.
 * Supports real-time speech-to-text (STT) and text-to-speech (TTS).
 *
 * Features:
 * - WebRTC-based low-latency voice streaming
 * - Voice Activity Detection (VAD) for natural conversation flow
 * - Multiple TTS voice options (alloy, echo, fable, onyx, nova, shimmer)
 * - Integration with FROK orchestrator for full agent capabilities
 *
 * @module voiceAgent
 * @see apps/web/src/hooks/useVoiceAgent.ts
 * @see apps/web/src/app/api/agent/voice/start/route.ts
 */

import { Runner, type AgentInputItem } from '@openai/agents';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type { EnhancedAgentSuite } from './orchestrator-enhanced';

let sharedOpenAI: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!sharedOpenAI) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for voice features');
    }
    sharedOpenAI = new OpenAI({ apiKey });
  }

  return sharedOpenAI;
}

/**
 * Voice configuration options
 */
export interface VoiceAgentConfig {
  /** User ID for authentication and personalization */
  userId: string;
  /** TTS voice selection */
  ttsVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  /** Enable speech-to-text */
  sttEnabled?: boolean;
  /** Enable voice activity detection */
  vadEnabled?: boolean;
  /** STT model selection */
  sttModel?: 'whisper-1' | 'whisper-1.5' | 'gpt-4o-mini-transcribe';
  /** Language code for STT (e.g., 'en', 'ko') */
  language?: string;
}

/**
 * Voice session state
 */
export interface VoiceSession {
  sessionId: string;
  userId: string;
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  startedAt: Date;
  config: VoiceAgentConfig;
}

/**
 * Voice agent wrapper for OpenAI Agents SDK
 *
 * Note: OpenAI's VoicePipeline is experimental and may require
 * additional setup. This implementation provides a foundation
 * for future integration.
 *
 * Current Status: Server pipeline available
 * - Uses OpenAI transcription + agent suite for responses
 * - Streams synthesized speech back with OpenAI TTS
 */
export class VoiceAgent {
  private session: VoiceSession | null = null;
  private config: Required<VoiceAgentConfig>;
  private readonly agentSuite: EnhancedAgentSuite;
  private readonly runner: Runner;
  private history: AgentInputItem[];

  constructor(
    agentSuite: EnhancedAgentSuite,
    config: VoiceAgentConfig
  ) {
    this.agentSuite = agentSuite;
    this.config = {
      userId: config.userId,
      ttsVoice: config.ttsVoice ?? 'alloy',
      sttEnabled: config.sttEnabled ?? true,
      vadEnabled: config.vadEnabled ?? true,
      sttModel: config.sttModel ?? 'gpt-4o-mini-transcribe',
      language: config.language ?? 'en',
    };
    this.runner = new Runner();
    this.history = [...agentSuite.primer];
  }

  /**
   * Start a new voice session
   *
   * @returns Session ID for WebRTC connection
   */
  async start(): Promise<string> {
    const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.session = {
      sessionId,
      userId: this.config.userId,
      isActive: true,
      isSpeaking: false,
      isListening: false,
      startedAt: new Date(),
      config: this.config,
    };

    console.log('[VoiceAgent] Session started:', sessionId);
    return sessionId;
  }

  /**
   * Stop the current voice session
   */
  async stop(): Promise<void> {
    if (!this.session) {
      throw new Error('No active voice session');
    }

    this.session.isActive = false;
    console.log('[VoiceAgent] Session stopped:', this.session.sessionId);
    this.session = null;
  }

  /**
   * Get current session state
   */
  getSession(): VoiceSession | null {
    return this.session;
  }

  /**
   * Process voice input (STT → Agent → TTS)
   *
   * @param _audioData - Audio input from microphone
   * @returns Audio response from TTS
   */
  async processVoiceInput(_audioData: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.session?.isActive) {
      throw new Error('No active voice session');
    }

    console.log('[VoiceAgent] Processing voice input...');

    if (!this.config.sttEnabled) {
      throw new Error('Speech-to-text is disabled for this session');
    }

    const openai = getOpenAIClient();

    const audioBuffer = Buffer.from(new Uint8Array(_audioData));
    const uploadable = await toFile(audioBuffer, 'voice-input.wav');

    const transcription = await openai.audio.transcriptions.create({
      file: uploadable,
      model: this.config.sttModel,
      language: this.config.language,
    });

    const transcript = transcription.text?.trim();

    if (!transcript) {
      throw new Error('No speech detected in audio sample');
    }

    const conversation: AgentInputItem[] = [
      ...this.history,
      {
        role: 'user',
        content: [{ type: 'input_text', text: transcript }],
      },
    ];

    const result = await this.runner.run(this.agentSuite.general, conversation);
    const finalOutput = String(result.finalOutput ?? '').trim();

    if (!finalOutput) {
      throw new Error('Assistant produced an empty response');
    }

    this.history = [
      ...conversation,
      {
        role: 'assistant',
        status: 'completed',
        content: [{ type: 'output_text', text: finalOutput }],
      },
    ].slice(-20); // Keep the last 20 turns

    this.session.isListening = false;
    this.session.isSpeaking = true;

    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: this.config.ttsVoice,
      input: finalOutput,
    });

    const responseBuffer = Buffer.from(await speech.arrayBuffer());

    this.session.isSpeaking = false;
    this.session.isListening = true;

    return responseBuffer.buffer.slice(
      responseBuffer.byteOffset,
      responseBuffer.byteOffset + responseBuffer.byteLength
    );
  }

  /**
   * Update TTS voice mid-session
   */
  async setVoice(voice: VoiceAgentConfig['ttsVoice']): Promise<void> {
    if (!voice) return;

    this.config.ttsVoice = voice;
    console.log('[VoiceAgent] Voice updated to:', voice);
  }

  /**
   * Toggle voice activity detection
   */
  async toggleVAD(enabled: boolean): Promise<void> {
    this.config.vadEnabled = enabled;
    console.log('[VoiceAgent] VAD:', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Get supported TTS voices
   */
  static getSupportedVoices(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
      { id: 'echo', name: 'Echo', description: 'Clear, professional voice' },
      { id: 'fable', name: 'Fable', description: 'Warm, expressive voice' },
      { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
      { id: 'nova', name: 'Nova', description: 'Energetic, friendly voice' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft, calming voice' },
    ];
  }
}

/**
 * Create a voice agent instance
 *
 * @param agentSuite - Enhanced agent suite with orchestrator
 * @param config - Voice configuration
 * @returns VoiceAgent instance
 *
 * @example
 * ```typescript
 * const suite = await createEnhancedAgentSuite({ userId });
 * const voiceAgent = createVoiceAgent(suite, {
 *   userId,
 *   ttsVoice: 'alloy',
 *   sttEnabled: true,
 *   vadEnabled: true,
 * });
 *
 * const sessionId = await voiceAgent.start();
 * // ... WebRTC connection setup
 * await voiceAgent.stop();
 * ```
 */
export function createVoiceAgent(
  agentSuite: EnhancedAgentSuite,
  config: VoiceAgentConfig
): VoiceAgent {
  return new VoiceAgent(agentSuite, config);
}

/**
 * Validate voice configuration
 */
export function validateVoiceConfig(config: VoiceAgentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.userId) {
    errors.push('userId is required');
  }

  if (config.ttsVoice && !['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(config.ttsVoice)) {
    errors.push('Invalid ttsVoice selection');
  }

  if (
    config.sttModel &&
    !['whisper-1', 'whisper-1.5', 'gpt-4o-mini-transcribe'].includes(config.sttModel)
  ) {
    errors.push('Unsupported STT model selection');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
