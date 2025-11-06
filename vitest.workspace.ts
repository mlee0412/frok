import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Client packages can use node environment
  {
    test: {
      name: '@frok/clients',
      root: './packages/clients',
      environment: 'node',
      include: ['**/*.{test,spec}.{ts,tsx}'],
      globals: true,
    },
  },
  // Web app needs jsdom for React components
  './apps/web/vitest.config.ts',
]);
