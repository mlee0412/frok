import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'e2e', '.next', 'dist', '**/*.spec.ts'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'e2e/',
        '.next/',
        '**/*.config.ts',
        '**/*.config.js',
        '**/types/',
        '**/schemas/',
        '**/*.d.ts',
        '**/middleware.ts',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      // Clean coverage directory before running tests
      clean: true,
      // Report uncovered lines
      all: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@frok/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});
