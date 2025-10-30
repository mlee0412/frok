/**
 * Performance Monitoring Utilities
 *
 * Provides utilities for tracking performance metrics beyond Core Web Vitals
 */

export type PerformanceMetric = {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url?: string;
};

/**
 * Get navigation timing metrics
 */
export function getNavigationTiming(): PerformanceMetric[] {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navigation) return [];

  return [
    {
      name: 'dns-lookup',
      value: navigation.domainLookupEnd - navigation.domainLookupStart,
      timestamp: Date.now(),
    },
    {
      name: 'tcp-connection',
      value: navigation.connectEnd - navigation.connectStart,
      timestamp: Date.now(),
    },
    {
      name: 'request-response',
      value: navigation.responseEnd - navigation.requestStart,
      timestamp: Date.now(),
    },
    {
      name: 'dom-interactive',
      value: navigation.domInteractive - navigation.fetchStart,
      timestamp: Date.now(),
    },
    {
      name: 'dom-complete',
      value: navigation.domComplete - navigation.fetchStart,
      timestamp: Date.now(),
    },
    {
      name: 'load-complete',
      value: navigation.loadEventEnd - navigation.fetchStart,
      timestamp: Date.now(),
    },
  ];
}

/**
 * Get resource timing metrics (slowest resources)
 */
export function getSlowResources(limit = 10): PerformanceMetric[] {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  // Sort by duration (slowest first)
  const slowest = resources
    .filter((r) => r.duration > 100) // Only resources taking > 100ms
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);

  return slowest.map((resource) => ({
    name: 'slow-resource',
    value: resource.duration,
    url: resource.name,
    timestamp: Date.now(),
    rating: resource.duration > 1000 ? 'poor' : resource.duration > 500 ? 'needs-improvement' : 'good',
  }));
}

/**
 * Detect memory leaks (if available)
 */
export function getMemoryMetrics(): PerformanceMetric[] {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return [];
  }

  const memory = (performance as any).memory;

  return [
    {
      name: 'used-js-heap',
      value: memory.usedJSHeapSize,
      timestamp: Date.now(),
    },
    {
      name: 'total-js-heap',
      value: memory.totalJSHeapSize,
      timestamp: Date.now(),
    },
    {
      name: 'js-heap-limit',
      value: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    },
  ];
}

/**
 * Track long tasks (tasks blocking main thread for > 50ms)
 */
export function observeLongTasks(callback: (metric: PerformanceMetric) => void): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback({
          name: 'long-task',
          value: entry.duration,
          timestamp: Date.now(),
          rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
        });
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => observer.disconnect();
  } catch (error) {
    console.warn('Long task observation not supported:', error);
    return () => {};
  }
}

/**
 * Track route changes (for SPA navigation)
 */
export function trackRouteChange(url: string, duration: number): PerformanceMetric {
  return {
    name: 'route-change',
    value: duration,
    url,
    timestamp: Date.now(),
    rating: duration > 1000 ? 'poor' : duration > 500 ? 'needs-improvement' : 'good',
  };
}

/**
 * Calculate performance score (0-100)
 * Based on Core Web Vitals thresholds
 */
export function calculatePerformanceScore(metrics: {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay (deprecated, use INP)
  inp?: number; // Interaction to Next Paint
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}): number {
  let score = 0;
  let count = 0;

  // LCP: Good < 2500ms, Poor > 4000ms
  if (metrics.lcp !== undefined) {
    if (metrics.lcp < 2500) score += 100;
    else if (metrics.lcp < 4000) score += 50;
    count++;
  }

  // INP: Good < 200ms, Poor > 500ms
  if (metrics.inp !== undefined) {
    if (metrics.inp < 200) score += 100;
    else if (metrics.inp < 500) score += 50;
    count++;
  }

  // CLS: Good < 0.1, Poor > 0.25
  if (metrics.cls !== undefined) {
    if (metrics.cls < 0.1) score += 100;
    else if (metrics.cls < 0.25) score += 50;
    count++;
  }

  // FCP: Good < 1800ms, Poor > 3000ms
  if (metrics.fcp !== undefined) {
    if (metrics.fcp < 1800) score += 100;
    else if (metrics.fcp < 3000) score += 50;
    count++;
  }

  // TTFB: Good < 800ms, Poor > 1800ms
  if (metrics.ttfb !== undefined) {
    if (metrics.ttfb < 800) score += 100;
    else if (metrics.ttfb < 1800) score += 50;
    count++;
  }

  return count > 0 ? Math.round(score / count) : 0;
}

/**
 * Send performance metrics to analytics
 */
export async function reportPerformanceMetrics(metrics: PerformanceMetric[]): Promise<void> {
  if (typeof window === 'undefined' || metrics.length === 0) {
    return;
  }

  try {
    const body = JSON.stringify({ metrics });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/performance', body);
    } else {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    }
  } catch (error) {
    console.error('[Performance] Failed to report metrics:', error);
  }
}

/**
 * Initialize comprehensive performance monitoring
 */
export function initPerformanceMonitoring(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  // Report navigation timing after load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navMetrics = getNavigationTiming();
      const slowResources = getSlowResources(5);
      const memoryMetrics = getMemoryMetrics();

      reportPerformanceMetrics([...navMetrics, ...slowResources, ...memoryMetrics]);
    }, 0);
  });

  // Observe long tasks
  const stopObservingLongTasks = observeLongTasks((metric) => {
    reportPerformanceMetrics([metric]);
  });
  cleanups.push(stopObservingLongTasks);

  // Track route changes (Next.js specific)
  if ('navigation' in window) {
    const navigation = (window as any).navigation;
    const startTime = Date.now();

    navigation.addEventListener?.('navigate', () => {
      const duration = Date.now() - startTime;
      const metric = trackRouteChange(window.location.href, duration);
      reportPerformanceMetrics([metric]);
    });
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
