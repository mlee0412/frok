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
  },
  // Enable webpack build ID for better caching
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default withBundleAnalyzer(nextConfig);
