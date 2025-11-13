'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

type TransitionDirection = 'forward' | 'backward';

// ============================================================================
// PageTransition Component
// ============================================================================

/**
 * PageTransition - Animated page transitions with direction detection
 *
 * Features:
 * - Detects navigation direction (forward/backward)
 * - Slide animations based on direction
 * - Fade transitions for smooth experience
 * - framer-motion AnimatePresence for exit animations
 * - Mobile-optimized performance
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [direction, setDirection] = useState<TransitionDirection>('forward');
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    // Detect navigation direction based on pathname depth
    const prevDepth = prevPathname.split('/').length;
    const currDepth = pathname.split('/').length;

    if (currDepth > prevDepth) {
      setDirection('forward');
    } else if (currDepth < prevDepth) {
      setDirection('backward');
    }

    setPrevPathname(pathname);
  }, [pathname, prevPathname]);

  const variants = {
    initial: (direction: TransitionDirection) => ({
      x: direction === 'forward' ? 50 : -50,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: TransitionDirection) => ({
      x: direction === 'forward' ? -50 : 50,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={pathname}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          type: 'tween',
          ease: 'easeInOut',
          duration: 0.2,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
