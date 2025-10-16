import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl } from './base';

let OLD_ENV: NodeJS.ProcessEnv;

beforeEach(() => {
  OLD_ENV = { ...process.env };
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.API_BASE_URL;
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('getApiBaseUrl', () => {
  it('returns /api by default when no env is set', () => {
    expect(getApiBaseUrl()).toBe('/api');
  });

  it('prefers NEXT_PUBLIC_API_BASE_URL when set', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://x.test';
    process.env.API_BASE_URL = 'https://y.test';
    expect(getApiBaseUrl()).toBe('https://x.test');
  });

  it('falls back to API_BASE_URL when NEXT_PUBLIC is not set', () => {
    process.env.API_BASE_URL = 'https://z.test';
    expect(getApiBaseUrl()).toBe('https://z.test');
  });
});
