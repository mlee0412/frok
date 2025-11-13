'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// StreamingText Component
// ============================================================================

/**
 * StreamingText - Typewriter effect for streaming AI responses
 *
 * Features:
 * - Word-by-word fade-in animation
 * - Blinking cursor at end
 * - Smooth text reveal
 * - Configurable speed
 * - Respects markdown formatting
 */

export interface StreamingTextProps {
  /**
   * Full text content to display
   */
  text: string;

  /**
   * Whether text is actively streaming (shows cursor)
   */
  isStreaming?: boolean;

  /**
   * Animation speed in milliseconds per word
   * @default 30
   */
  speed?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function StreamingText({
  text,
  isStreaming = false,
  speed = 30,
  className = '',
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  // Animate text reveal
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  // Split into words for animation
  const words = displayedText.split(' ');

  return (
    <span className={className}>
      <AnimatePresence mode="popLayout">
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.15,
              ease: 'easeOut',
            }}
            className="inline-block"
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Blinking Cursor */}
      {isStreaming && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="ml-0.5 inline-block h-4 w-0.5 bg-primary"
        />
      )}
    </span>
  );
}
