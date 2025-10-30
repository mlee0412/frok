'use client';

import { useEffect } from 'react';
import { onCLS, onLCP, onFCP, onTTFB, onINP, type Metric } from 'web-vitals';

export function WebVitals() {
  useEffect(() => {
    const reportMetric = (metric: Metric) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
        });
      }

      // Send to analytics endpoint in production
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
        });

        // Use sendBeacon if available, fallback to fetch
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/vitals', body);
        } else {
          fetch('/api/analytics/vitals', {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(console.error);
        }
      }
    };

    // Track Core Web Vitals (web-vitals v5+)
    onCLS(reportMetric);  // Cumulative Layout Shift
    onLCP(reportMetric);  // Largest Contentful Paint
    onFCP(reportMetric);  // First Contentful Paint
    onTTFB(reportMetric); // Time to First Byte
    onINP(reportMetric);  // Interaction to Next Paint (replaces deprecated FID)
  }, []);

  return null;
}
