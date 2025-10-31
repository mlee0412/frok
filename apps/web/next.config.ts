import type { NextConfig } from 'next';

// Bundle analyzer setup
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

const nextConfig: NextConfig = {
  transpilePackages: ['@frok/clients', '@frok/types', '@frok/utils', '@frok/ui'],
  async rewrites() {
    return [{ source: '/api/health', destination: '/api/ping' }];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        pathname: '/storage/v1/object/**',
      },
    ],
    // Enable dangerouslyAllowSVG for SVG optimization (PWA icons)
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable webpack build ID for better caching
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default withBundleAnalyzer(nextConfig);
