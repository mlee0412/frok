/**
 * AudioStreamer - MediaSource Extensions Audio Playback
 *
 * Provides low-latency audio streaming using MediaSource Extensions API.
 * Supports progressive audio playback with chunked MP3 delivery.
 *
 * Features:
 * - Automatic playback start when buffer reaches threshold (300ms)
 * - Queue management for handling bursts of audio chunks
 * - Error handling with fallback to Blob URL playback
 * - Browser compatibility (Chrome, Firefox, Safari)
 *
 * Usage:
 * ```typescript
 * const streamer = new AudioStreamer({
 *   mimeType: 'audio/mpeg',
 *   onPlaybackStart: () => console.log('Playing'),
 *   onPlaybackEnd: () => console.log('Finished'),
 * });
 *
 * // Append audio chunks as they arrive
 * streamer.appendAudio(uint8Array);
 *
 * // Stop playback
 * streamer.stop();
 *
 * // Cleanup
 * streamer.destroy();
 * ```
 */

import type { AudioStreamerConfig } from '@/types/voice';

export class AudioStreamer {
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: Uint8Array[] = [];
  private isUpdating = false;
  private config: AudioStreamerConfig;
  private useFallback = false;
  private fallbackChunks: Uint8Array[] = [];

  constructor(config: AudioStreamerConfig) {
    this.config = {
      minBufferDuration: 0.3, // Auto-start playback at 300ms buffer
      ...config,
    };

    this.audio = document.createElement('audio');
    this.audio.autoplay = false; // Manual control for better timing

    // Check MediaSource support
    if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(this.config.mimeType)) {
      this.initializeMediaSource();
    } else {
      console.warn('[AudioStreamer] MediaSource not supported, using fallback');
      this.useFallback = true;
    }

    this.setupAudioEventListeners();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeMediaSource() {
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);

    this.mediaSource.addEventListener('sourceopen', () => {
      this.onSourceOpen();
    });

    this.mediaSource.addEventListener('sourceended', () => {
      console.log('[AudioStreamer] MediaSource ended');
    });

    this.mediaSource.addEventListener('sourceclose', () => {
      console.log('[AudioStreamer] MediaSource closed');
    });
  }

  private onSourceOpen() {
    try {
      if (!this.mediaSource || this.mediaSource.readyState !== 'open') {
        return;
      }

      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.config.mimeType);

      this.sourceBuffer.addEventListener('updateend', () => {
        this.isUpdating = false;
        this.processQueue();
      });

      this.sourceBuffer.addEventListener('error', (e) => {
        console.error('[AudioStreamer] SourceBuffer error:', e);
        this.config.onError?.(new Error('SourceBuffer error'));
      });

      // Process any queued chunks
      this.processQueue();
    } catch (error) {
      console.error('[AudioStreamer] Failed to initialize SourceBuffer:', error);
      this.useFallback = true;
      this.config.onError?.(error as Error);
    }
  }

  private setupAudioEventListeners() {
    this.audio.addEventListener('play', () => {
      this.config.onPlaybackStart?.();
    });

    this.audio.addEventListener('ended', () => {
      this.config.onPlaybackEnd?.();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('[AudioStreamer] Audio playback error:', e);
      this.config.onError?.(new Error('Audio playback error'));
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Append audio chunk to playback stream
   */
  appendAudio(chunk: Uint8Array) {
    if (this.useFallback) {
      this.fallbackChunks.push(chunk);
      this.playFallback();
      return;
    }

    this.queue.push(chunk);

    if (!this.isUpdating && this.sourceBuffer) {
      this.processQueue();
    }
  }

  /**
   * Stop playback and reset
   */
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.queue = [];
    this.fallbackChunks = [];
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();

    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch (error) {
        console.warn('[AudioStreamer] Error ending stream:', error);
      }
    }

    if (this.audio.src) {
      URL.revokeObjectURL(this.audio.src);
    }

    this.sourceBuffer = null;
    this.mediaSource = null;
  }

  // ============================================================================
  // MediaSource Extensions Implementation
  // ============================================================================

  private processQueue() {
    if (this.queue.length === 0 || !this.sourceBuffer || this.isUpdating) {
      return;
    }

    try {
      const chunk = this.queue.shift()!;
      this.isUpdating = true;
      this.sourceBuffer.appendBuffer(chunk as any);

      // Auto-start playback when buffer reaches threshold
      this.maybeStartPlayback();
    } catch (error) {
      console.error('[AudioStreamer] Error appending buffer:', error);
      this.isUpdating = false;
      this.config.onError?.(error as Error);
    }
  }

  private maybeStartPlayback() {
    if (this.audio.paused && this.audio.buffered.length > 0) {
      const buffered = this.audio.buffered.end(0) - this.audio.currentTime;

      if (buffered >= this.config.minBufferDuration!) {
        this.audio.play().catch((err) => {
          console.error('[AudioStreamer] Playback start failed:', err);
          this.config.onError?.(err);
        });
      }
    }
  }

  // ============================================================================
  // Fallback Implementation (Blob URL)
  // ============================================================================

  private playFallback() {
    if (this.fallbackChunks.length === 0) return;

    // Concatenate all chunks
    const totalLength = this.fallbackChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of this.fallbackChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Create Blob and play
    const blob = new Blob([combined], { type: this.config.mimeType });
    const url = URL.createObjectURL(blob);

    const previousUrl = this.audio.src;
    this.audio.src = url;

    this.audio.play().catch((err) => {
      console.error('[AudioStreamer] Fallback playback failed:', err);
      this.config.onError?.(err);
    });

    // Cleanup previous URL
    if (previousUrl && previousUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previousUrl);
    }

    this.fallbackChunks = [];
  }
}

/**
 * Helper: Convert base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
