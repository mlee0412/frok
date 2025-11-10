/**
 * OpenAI Client Configuration
 * Shared OpenAI client instance for LLM operations
 */

import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});
