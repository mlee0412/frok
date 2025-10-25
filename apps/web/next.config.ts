import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@frok/clients', '@frok/types', '@frok/utils', '@frok/ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [{ source: '/api/health', destination: '/api/ping' }];
  },
};

export default nextConfig;
