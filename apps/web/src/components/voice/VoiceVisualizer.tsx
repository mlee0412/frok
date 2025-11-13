'use client';

import { useEffect, useRef } from 'react';

// ============================================================================
// VoiceVisualizer Component
// ============================================================================

/**
 * VoiceVisualizer - Real-time audio waveform visualization
 *
 * Features:
 * - Canvas-based waveform rendering (60fps)
 * - Real-time audio levels from AudioContext (when available)
 * - Smooth animations with sine wave patterns
 * - Color changes based on voice mode
 * - Responsive sizing
 */

interface VoiceVisualizerProps {
  mode: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  audioContext?: AudioContext | null;
  analyser?: AnalyserNode | null;
}

export function VoiceVisualizer({ mode, analyser }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const barCount = 60;
    const barWidth = width / barCount;

    // Audio data buffer (if analyser available)
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    function drawWaveform() {
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // Get real-time audio levels if available
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth;

        // Calculate amplitude
        let amplitude: number;
        if (dataArray && analyser && (mode === 'listening' || mode === 'speaking')) {
          // Use real audio data (map frequency bins to bars)
          const binIndex = Math.floor((i / barCount) * dataArray.length);
          amplitude = ((dataArray[binIndex] ?? 0) / 255) * (height / 2);
        } else if (mode === 'listening' || mode === 'speaking') {
          // Animated sine wave
          amplitude =
            Math.sin(Date.now() / 200 + i * 0.3) * (height / 4) + Math.random() * (height / 8);
        } else if (mode === 'processing') {
          // Pulsing animation
          amplitude = Math.abs(Math.sin(Date.now() / 500 + i * 0.1)) * (height / 3);
        } else {
          // Idle: minimal movement
          amplitude = 5 + Math.sin(Date.now() / 1000 + i * 0.2) * 3;
        }

        // Color based on mode
        let color: string;
        switch (mode) {
          case 'listening':
            color = 'rgba(34, 211, 238, 0.6)'; // Primary color (cyan)
            break;
          case 'speaking':
            color = 'rgba(34, 197, 94, 0.6)'; // Success color (green)
            break;
          case 'processing':
            color = 'rgba(251, 146, 60, 0.6)'; // Warning color (orange)
            break;
          case 'error':
            color = 'rgba(239, 68, 68, 0.6)'; // Danger color (red)
            break;
          default:
            color = 'rgba(255, 255, 255, 0.2)'; // Idle (gray)
        }

        // Draw bar
        ctx.fillStyle = color;
        ctx.fillRect(x, centerY - amplitude, barWidth - 2, amplitude * 2);

        // Add gradient effect for active modes
        if (mode !== 'idle') {
          const gradient = ctx.createLinearGradient(x, centerY - amplitude, x, centerY + amplitude);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, color.replace('0.6)', '0.8)'));
          gradient.addColorStop(1, color);
          ctx.fillStyle = gradient;
          ctx.fillRect(x, centerY - amplitude, barWidth - 2, amplitude * 2);
        }
      }

      animationRef.current = requestAnimationFrame(drawWaveform);
    }

    drawWaveform();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, analyser]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="h-32 w-full rounded-lg bg-surface/40 shadow-inner md:h-40"
        style={{ width: '100%', height: 'auto' }}
      />

      {/* Overlay effects */}
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-background/10 to-transparent" />

      {/* Pulse effect for listening mode */}
      {mode === 'listening' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 animate-ping rounded-full bg-primary/20" />
        </div>
      )}
    </div>
  );
}
