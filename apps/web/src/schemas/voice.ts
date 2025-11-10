import { z } from 'zod';

/**
 * Voice Assistant Validation Schemas
 * Zod schemas for validating voice-related API requests and responses
 */

// ============================================================================
// WebSocket Message Schemas
// ============================================================================

/**
 * Client → Server: Audio input chunk
 */
export const AudioInputSchema = z.object({
  type: z.literal('audio_input'),
  data: z.string(), // Base64-encoded audio
});

/**
 * Client → Server: End of utterance signal
 */
export const EndUtteranceSchema = z.object({
  type: z.literal('end_utterance'),
});

/**
 * Client → Server: Interrupt current response
 */
export const InterruptSchema = z.object({
  type: z.literal('interrupt'),
});

/**
 * Union of all client-to-server messages
 */
export const ClientVoiceMessageSchema = z.discriminatedUnion('type', [
  AudioInputSchema,
  EndUtteranceSchema,
  InterruptSchema,
]);

/**
 * Server → Client: STT transcription result
 */
export const STTResultSchema = z.object({
  type: z.literal('stt_result'),
  text: z.string(),
});

/**
 * Server → Client: LLM streaming token
 */
export const LLMTokenSchema = z.object({
  type: z.literal('llm_token'),
  token: z.string(),
});

/**
 * Server → Client: TTS audio chunk
 */
export const AudioChunkSchema = z.object({
  type: z.literal('audio_chunk'),
  data: z.string(), // Base64-encoded MP3
});

/**
 * Server → Client: Response complete
 */
export const ResponseCompleteSchema = z.object({
  type: z.literal('response_complete'),
});

/**
 * Server → Client: Error message
 */
export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  error: z.string(),
});

/**
 * Union of all server-to-client messages
 */
export const ServerVoiceMessageSchema = z.discriminatedUnion('type', [
  STTResultSchema,
  LLMTokenSchema,
  AudioChunkSchema,
  ResponseCompleteSchema,
  ErrorMessageSchema,
]);

// ============================================================================
// Voice Settings Schemas
// ============================================================================

/**
 * Voice assistant settings
 */
export const VoiceSettingsSchema = z.object({
  voiceId: z.string().nullable(),
  autoStart: z.boolean(),
  vadSensitivity: z.number().min(0.001).max(0.1),
  silenceThreshold: z.number().min(100).max(2000), // ms
  maxUtteranceLength: z.number().min(5).max(120), // seconds
});

/**
 * Update voice configuration request
 */
export const UpdateVoiceConfigSchema = z.object({
  voiceId: z.string().optional(),
  vadSensitivity: z.number().min(0.001).max(0.1).optional(),
  autoStart: z.boolean().optional(),
});

// ============================================================================
// Voice Message Schemas
// ============================================================================

/**
 * Voice message in conversation history
 */
export const VoiceMessageRecordSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
  audioUrl: z.string().url().optional(),
});

/**
 * Save conversation request
 */
export const SaveConversationSchema = z.object({
  messages: z.array(VoiceMessageRecordSchema),
  duration: z.number().min(0), // seconds
});

// ============================================================================
// Voice Configuration Response Schema
// ============================================================================

/**
 * Available voice option
 */
export const VoiceOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum(['elevenlabs', 'openai']),
  language: z.string(),
  previewUrl: z.string().url().optional(),
});

/**
 * Voice configuration response from API
 */
export const VoiceConfigResponseSchema = z.object({
  voices: z.array(VoiceOptionSchema),
  defaultVoiceId: z.string(),
  settings: VoiceSettingsSchema,
});

// ============================================================================
// Database Schemas
// ============================================================================

/**
 * voice_conversations table insert
 */
export const InsertVoiceConversationSchema = z.object({
  user_id: z.string().uuid(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  message_count: z.number().default(0),
});

/**
 * voice_messages table insert
 */
export const InsertVoiceMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  audio_url: z.string().url().nullable().optional(),
  timestamp: z.string().datetime().optional(),
});

// ============================================================================
// Type Inference Exports
// ============================================================================

export type ClientVoiceMessage = z.infer<typeof ClientVoiceMessageSchema>;
export type ServerVoiceMessage = z.infer<typeof ServerVoiceMessageSchema>;
export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;
export type UpdateVoiceConfig = z.infer<typeof UpdateVoiceConfigSchema>;
export type VoiceMessageRecord = z.infer<typeof VoiceMessageRecordSchema>;
export type SaveConversation = z.infer<typeof SaveConversationSchema>;
export type VoiceOption = z.infer<typeof VoiceOptionSchema>;
export type VoiceConfigResponse = z.infer<typeof VoiceConfigResponseSchema>;
export type InsertVoiceConversation = z.infer<typeof InsertVoiceConversationSchema>;
export type InsertVoiceMessage = z.infer<typeof InsertVoiceMessageSchema>;
