/**
 * OpenAI Client Configuration
 * Lazy-loaded OpenAI client instance for LLM operations
 *
 * Using lazy initialization to avoid requiring OPENAI_API_KEY during build time.
 * The client is only instantiated when actually used at runtime.
 */

import OpenAI from 'openai';

let cachedClient: OpenAI | null = null;

/**
 * Get or create the OpenAI client instance
 * Lazy initialization prevents build-time errors when env vars aren't available
 */
export function getOpenAIClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'],
    });
  }
  return cachedClient;
}

/**
 * @deprecated Use getOpenAIClient() instead for lazy initialization
 * This export is kept for backwards compatibility but will be removed in future
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAIClient()[prop as keyof OpenAI];
  },
});
