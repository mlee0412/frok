# Performance Monitoring & Metrics

This document describes the comprehensive performance monitoring system implemented in the FROK web application.

## Overview

The application tracks two categories of performance metrics:

1. **Core Web Vitals** - Google's user-centric performance metrics
2. **Custom Performance Metrics** - Additional metrics for deep insights

## Core Web Vitals

### Tracked Metrics

#### 1. Largest Contentful Paint (LCP)
- **What**: Time until largest content element is visible
- **Good**: < 2.5s
- **Poor**: > 4.0s
- **Impact**: User perception of page load speed

#### 2. Interaction to Next Paint (INP)
- **What**: Responsiveness to user interactions
- **Good**: < 200ms
- **Poor**: > 500ms
- **Impact**: User perception of interactivity
- **Note**: Replaces deprecated First Input Delay (FID)

#### 3. Cumulative Layout Shift (CLS)
- **What**: Visual stability (unexpected layout shifts)
- **Good**: < 0.1
- **Poor**: > 0.25
- **Impact**: User experience and usability

#### 4. First Contentful Paint (FCP)
- **What**: Time until first content is rendered
- **Good**: < 1.8s
- **Poor**: > 3.0s
- **Impact**: User perception of loading start

#### 5. Time to First Byte (TTFB)
- **What**: Server response time
- **Good**: < 800ms
- **Poor**: > 1.8s
- **Impact**: Backend performance and caching

### Implementation

**Component**: `src/components/WebVitals.tsx`

```typescript
import { onCLS, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

// Automatically tracks all Core Web Vitals
// Reports to /api/analytics/vitals endpoint
```

**API Endpoint**: `src/app/api/analytics/vitals/route.ts`

- Receives Core Web Vitals metrics
- Logs to console in development
- Sends to analytics service in production

## Custom Performance Metrics

### Tracked Metrics

#### Navigation Timing
- **DNS Lookup**: Domain name resolution time
- **TCP Connection**: Network connection time
- **Request-Response**: Server processing time
- **DOM Interactive**: Time until DOM is interactive
- **DOM Complete**: Time until DOM is fully parsed
- **Load Complete**: Time until page is fully loaded

#### Resource Timing
- **Slow Resources**: Resources taking > 100ms
- **Duration**: Load time for each resource
- **URL**: Resource path for debugging
- **Rating**: Good (< 500ms), Needs Improvement (< 1000ms), Poor (> 1000ms)

#### Memory Metrics
- **Used JS Heap**: Current JavaScript memory usage
- **Total JS Heap**: Total allocated heap
- **JS Heap Limit**: Maximum heap size

#### Long Tasks
- **Duration**: Tasks blocking main thread
- **Threshold**: Tasks > 50ms are tracked
- **Impact**: Identifies jank and scroll issues

#### Route Changes
- **Duration**: Time for SPA navigation
- **URL**: Route navigated to
- **Rating**: Based on duration thresholds

### Implementation

**Utilities**: `src/lib/performance.ts`

```typescript
// Get navigation timing
const navMetrics = getNavigationTiming();

// Get slowest resources
const slowResources = getSlowResources(10);

// Get memory usage
const memoryMetrics = getMemoryMetrics();

// Observe long tasks
const cleanup = observeLongTasks((metric) => {
  reportPerformanceMetrics([metric]);
});

// Track route change
const metric = trackRouteChange(url, duration);
```

**Component**: `src/components/PerformanceMonitor.tsx`

```typescript
// Automatically initializes all performance monitoring
// Production-only (disabled in development)
```

**API Endpoint**: `src/app/api/analytics/performance/route.ts`

- Receives custom performance metrics
- Batches multiple metrics per request
- Logs to console in development
- Stores/forwards to analytics in production

## Performance Score

### Calculation

The application calculates a performance score (0-100) based on Core Web Vitals:

```typescript
const score = calculatePerformanceScore({
  lcp: 2000,  // ms
  inp: 150,   // ms
  cls: 0.05,  // score
  fcp: 1500,  // ms
  ttfb: 600,  // ms
});

// Returns: 100 (all metrics are "good")
```

### Score Breakdown
- **90-100**: Excellent - All metrics in "good" range
- **50-89**: Good - Most metrics in "good" range, some need improvement
- **0-49**: Poor - Many metrics in "needs improvement" or "poor" range

## Analytics Integration

### Development Mode

In development, all metrics are logged to the browser console:

```
[Web Vitals] LCP: { value: 1234, rating: 'good', delta: 0 }
[Performance Metrics] { count: 5, metrics: [...] }
```

### Production Mode

In production, metrics are sent to analytics endpoints:

#### Core Web Vitals
- **Endpoint**: `POST /api/analytics/vitals`
- **Method**: `navigator.sendBeacon()` with fetch fallback
- **Frequency**: Once per metric per page load

#### Custom Metrics
- **Endpoint**: `POST /api/analytics/performance`
- **Method**: `navigator.sendBeacon()` with fetch fallback
- **Frequency**: Once on page load, continuously for long tasks

### Connecting Analytics Services

To connect to external analytics services, modify the API routes:

**Example: Vercel Analytics**
```typescript
// src/app/api/analytics/vitals/route.ts
import { track } from '@vercel/analytics';

export async function POST(request: NextRequest) {
  const body = await request.json();

  await track('web-vital', {
    metric: body.name,
    value: body.value,
    rating: body.rating,
  });

  return NextResponse.json({ success: true });
}
```

**Example: DataDog**
```typescript
// src/app/api/analytics/performance/route.ts
import { datadogLogs } from '@datadog/browser-logs';

export async function POST(request: NextRequest) {
  const { metrics } = await request.json();

  metrics.forEach(metric => {
    datadogLogs.logger.info('performance-metric', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
    });
  });

  return NextResponse.json({ success: true });
}
```

**Example: Custom Database**
```typescript
// src/app/api/analytics/vitals/route.ts
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();

  await db.webVitals.create({
    data: {
      name: body.name,
      value: body.value,
      rating: body.rating,
      url: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
```

## Performance Optimization Checklist

### Immediate Improvements
- ✅ Core Web Vitals tracking enabled
- ✅ Custom performance monitoring enabled
- ✅ Code splitting implemented
- ✅ Service worker caching configured
- ✅ Image optimization configured (AVIF, WebP)

### Next Steps
- ⏳ Set up analytics dashboard for metrics visualization
- ⏳ Configure alerting for poor performance scores
- ⏳ Implement performance budgets in CI/CD
- ⏳ Add RUM (Real User Monitoring) service integration
- ⏳ Create performance comparison reports

## Monitoring Performance Over Time

### Local Development

1. **Chrome DevTools**
   - Performance tab for profiling
   - Lighthouse for audits
   - Coverage tab for unused code

2. **Next.js Build Output**
   ```bash
   pnpm run build

   # Shows bundle sizes:
   Route (app)              Size     First Load JS
   ┌ ○ /                    1.2 kB          85 kB
   ├ ○ /dashboard          2.4 kB          87 kB
   ├ ○ /agent              5.8 kB          91 kB
   ```

3. **Bundle Analyzer**
   ```bash
   pnpm run build:analyze

   # Opens interactive bundle visualization
   ```

### Production Monitoring

1. **Real User Monitoring (RUM)**
   - Vercel Analytics
   - Google Analytics 4
   - DataDog RUM
   - New Relic Browser

2. **Synthetic Monitoring**
   - Lighthouse CI
   - WebPageTest
   - GTmetrix
   - SpeedCurve

3. **Performance Budgets**
   ```json
   {
     "budgets": [
       {
         "resourceSizes": [
           { "resourceType": "script", "budget": 300 },
           { "resourceType": "stylesheet", "budget": 50 },
           { "resourceType": "image", "budget": 200 },
           { "resourceType": "total", "budget": 500 }
         ]
       }
     ]
   }
   ```

## Performance Debugging

### Common Issues

#### Poor LCP
- Large images not optimized
- Critical CSS not inlined
- Server-side rendering too slow
- **Fix**: Optimize images, use Next.js Image component, implement ISR

#### Poor INP
- Heavy JavaScript on main thread
- Long tasks blocking interactions
- Event handlers not debounced
- **Fix**: Code splitting, use Web Workers, debounce events

#### Poor CLS
- Images without dimensions
- Dynamic content insertion
- Web fonts causing FOIT/FOUT
- **Fix**: Reserve space for images, use font-display: swap

#### Poor FCP
- Large bundle sizes
- Render-blocking resources
- Slow TTFB
- **Fix**: Code splitting, critical CSS, CDN, caching

#### Poor TTFB
- Slow database queries
- No caching
- Cold starts (serverless)
- **Fix**: Database indexes, Redis cache, edge functions

### Debugging Tools

```typescript
// Enable performance marks in code
performance.mark('component-render-start');
// ... component logic
performance.mark('component-render-end');
performance.measure('component-render', 'component-render-start', 'component-render-end');

// Get all measures
const measures = performance.getEntriesByType('measure');
console.log('Component render time:', measures[0].duration);
```

## Performance Testing

### Load Testing
```bash
# Use Artillery or k6 for load testing
artillery quick --count 10 --num 100 https://your-app.vercel.app

# Simulates 10 virtual users making 100 requests each
```

### Lighthouse CI
```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://your-app.vercel.app
      https://your-app.vercel.app/dashboard
      https://your-app.vercel.app/agent
    budgetPath: './lighthouserc.json'
    uploadArtifacts: true
```

## Best Practices

### 1. Measure First
- Always measure before optimizing
- Use real user data, not just lab data
- Track metrics over time, not point-in-time

### 2. Optimize Critical Path
- Prioritize above-the-fold content
- Inline critical CSS
- Defer non-critical JavaScript

### 3. Code Splitting
- Split routes automatically (Next.js default)
- Dynamic import heavy components
- Lazy load below-the-fold content

### 4. Caching Strategy
- Service worker for offline support
- CDN for static assets
- Browser caching headers
- ISR for dynamic content

### 5. Image Optimization
- Use Next.js Image component
- Enable AVIF/WebP formats
- Responsive images with srcset
- Lazy load images below fold

### 6. Monitoring
- Track Core Web Vitals
- Monitor custom metrics
- Set up alerts for regressions
- Regular performance audits

## Resources

### Documentation
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Chrome User Experience Report](https://developers.google.com/web/tools/chrome-user-experience-report)

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [web-vitals](https://www.npmjs.com/package/web-vitals)

### Services
- [Vercel Analytics](https://vercel.com/analytics)
- [DataDog RUM](https://www.datadoghq.com/product/real-user-monitoring/)
- [New Relic Browser](https://newrelic.com/products/browser-monitoring)
- [SpeedCurve](https://www.speedcurve.com/)
