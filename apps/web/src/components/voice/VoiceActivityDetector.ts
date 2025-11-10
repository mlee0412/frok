/**
 * Voice Activity Detector (VAD) - RMS-based Speech Detection
 *
 * Detects user speech in audio stream for interrupt/barge-in support.
 * Uses Root Mean Square (RMS) energy analysis to identify voice activity.
 *
 * Features:
 * - Real-time speech detection with configurable threshold
 * - Minimum speech duration filter (reduces false positives)
 * - Callback-based event system (onSpeechStart, onSpeechEnd)
 * - 100ms polling interval for responsiveness
 *
 * Usage:
 * ```typescript
 * const audioContext = new AudioContext({ sampleRate: 16000 });
 * const source = audioContext.createMediaStreamSource(stream);
 *
 * const vad = new VoiceActivityDetector(audioContext, {
 *   threshold: 0.01, // RMS threshold
 *   minSpeechDuration: 300, // ms
 *   onSpeechStart: () => handleInterrupt(),
 * });
 *
 * source.connect(vad.analyser);
 *
 * // Cleanup
 * vad.destroy();
 * ```
 */

import type { VADConfig } from '@/types/voice';

export class VoiceActivityDetector {
  public analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private config: Required<VADConfig>;
  private speechStartTime: number | null = null;
  private isSpeaking = false;
  private intervalId: number | null = null;

  constructor(audioContext: AudioContext, config: Partial<VADConfig> = {}) {
    // Merge with defaults
    this.config = {
      threshold: config.threshold ?? 0.01,
      minSpeechDuration: config.minSpeechDuration ?? 300,
      onSpeechStart: config.onSpeechStart ?? (() => {}),
      onSpeechEnd: config.onSpeechEnd ?? (() => {}),
    };

    // Create analyzer node
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048; // FFT size for frequency analysis
    this.analyser.smoothingTimeConstant = 0.8; // Smooth RMS values

    // Allocate data array for time-domain samples
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Start detection loop
    this.startDetection();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update VAD threshold (RMS level)
   */
  setThreshold(threshold: number) {
    this.config.threshold = threshold;
  }

  /**
   * Update minimum speech duration
   */
  setMinDuration(duration: number) {
    this.config.minSpeechDuration = duration;
  }

  /**
   * Get current speech state
   */
  isSpeechDetected(): boolean {
    return this.isSpeaking;
  }

  /**
   * Stop detection and cleanup
   */
  destroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ============================================================================
  // Detection Logic
  // ============================================================================

  private startDetection() {
    // Poll audio data every 100ms
    this.intervalId = window.setInterval(() => {
      this.detectSpeech();
    }, 100);
  }

  private detectSpeech() {
    // Get time-domain samples
    this.analyser.getByteTimeDomainData(this.dataArray as any);

    // Calculate RMS (Root Mean Square) energy
    const rms = this.calculateRMS();

    // Check if speech is currently detected
    const isSpeakingNow = rms > this.config.threshold;

    if (isSpeakingNow && !this.speechStartTime) {
      // Speech started
      this.speechStartTime = Date.now();
    } else if (isSpeakingNow && this.speechStartTime) {
      // Speech continuing
      const duration = Date.now() - this.speechStartTime;

      // Trigger onSpeechStart only after min duration
      if (duration >= this.config.minSpeechDuration && !this.isSpeaking) {
        this.isSpeaking = true;
        this.config.onSpeechStart();
      }
    } else if (!isSpeakingNow) {
      // No speech detected
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.config.onSpeechEnd?.();
      }
      this.speechStartTime = null;
    }
  }

  /**
   * Calculate Root Mean Square (RMS) energy from time-domain samples
   */
  private calculateRMS(): number {
    let sum = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      // Normalize samples from [0, 255] to [-1, 1]
      const normalized = (this.dataArray[i]! - 128) / 128;
      sum += normalized * normalized;
    }

    return Math.sqrt(sum / this.dataArray.length);
  }
}

/**
 * Helper: Create VAD with auto-connected media stream
 */
export async function createVADFromStream(
  stream: MediaStream,
  config?: Partial<VADConfig>
): Promise<VoiceActivityDetector> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);

  const vad = new VoiceActivityDetector(audioContext, config);
  source.connect(vad.analyser);

  return vad;
}
