'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/performance';

/**
 * Performance Monitor Component
 *
 * Initializes comprehensive performance monitoring including:
 * - Navigation timing
 * - Resource timing (slow resources)
 * - Memory metrics
 * - Long tasks
 * - Route changes
 *
 * Works alongside WebVitals component for Core Web Vitals tracking
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Only in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // Initialize performance monitoring
    const cleanup = initPerformanceMonitoring();

    return cleanup;
  }, []);

  return null;
}
