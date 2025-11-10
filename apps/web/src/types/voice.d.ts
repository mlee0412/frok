/**
 * Voice Assistant Type Definitions
 * Type-safe definitions for voice conversation state and WebSocket messages
 */

// ============================================================================
// Voice Message Types (Client ↔ Server WebSocket Communication)
// ============================================================================

/**
 * Messages sent from client → server
 */
export type ClientVoiceMessage =
  | { type: 'audio_input'; data: string } // Base64-encoded audio chunk
  | { type: 'end_utterance' } // Manual end-of-speech signal
  | { type: 'interrupt' }; // Cancel current assistant response

/**
 * Messages sent from server → client
 */
export type ServerVoiceMessage =
  | { type: 'stt_result'; text: string } // Transcribed user speech
  | { type: 'llm_token'; token: string } // Streaming LLM token
  | { type: 'audio_chunk'; data: string } // Base64 TTS audio (MP3)
  | { type: 'response_complete' } // End of assistant turn
  | { type: 'error'; error: string }; // Error message

/**
 * Union of all WebSocket message types
 */
export type VoiceMessage = ClientVoiceMessage | ServerVoiceMessage;

// ============================================================================
// Conversation State Types
// ============================================================================

/**
 * Voice assistant conversation state machine
 */
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted' | 'error';

/**
 * Voice message stored in conversation history
 */
export interface VoiceMessageRecord {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  audioUrl?: string; // Optional: S3/Supabase storage URL
}

/**
 * Voice conversation metadata
 */
export interface VoiceConversation {
  id: string;
  userId: string;
  messages: VoiceMessageRecord[];
  startedAt: string;
  endedAt: string | null;
  duration: number; // seconds
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Voice assistant settings
 */
export interface VoiceSettings {
  voiceId: string | null; // ElevenLabs voice ID
  autoStart: boolean; // Auto-start listening
  vadSensitivity: number; // VAD threshold (0.001-0.1)
  silenceThreshold: number; // ms of silence = end of utterance
  maxUtteranceLength: number; // seconds
}

/**
 * Available voice options
 */
export interface VoiceOption {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'openai';
  language: string;
  previewUrl?: string;
}

/**
 * Voice configuration response from API
 */
export interface VoiceConfigResponse {
  voices: VoiceOption[];
  defaultVoiceId: string;
  settings: VoiceSettings;
}

// ============================================================================
// WebSocket Manager Types
// ============================================================================

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
  url: string;
  onMessage: (message: VoiceMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number; // ms
  maxReconnectAttempts?: number;
}

// ============================================================================
// Audio Streaming Types
// ============================================================================

/**
 * AudioStreamer configuration for MediaSource Extensions
 */
export interface AudioStreamerConfig {
  mimeType: string; // e.g., 'audio/mpeg', 'audio/webm'
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
  minBufferDuration?: number; // seconds (default: 0.3)
}

/**
 * Voice Activity Detection configuration
 */
export interface VADConfig {
  threshold: number; // RMS threshold for speech detection (default: 0.01)
  minSpeechDuration: number; // ms to trigger interrupt (default: 300)
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to update voice settings
 */
export interface UpdateVoiceConfigRequest {
  voiceId?: string;
  vadSensitivity?: number;
  autoStart?: boolean;
}

/**
 * Request to save conversation history
 */
export interface SaveConversationRequest {
  messages: VoiceMessageRecord[];
  duration: number; // seconds
}

/**
 * Response for conversation history
 */
export interface VoiceHistoryResponse {
  conversations: VoiceConversation[];
}

// ============================================================================
// Database Types (Supabase)
// ============================================================================

/**
 * voice_conversations table row
 */
export interface VoiceConversationRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * voice_messages table row
 */
export interface VoiceMessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audio_url: string | null;
  timestamp: string;
  created_at: string;
}
