import OpenAI from 'openai';
import { ElevenLabsTTSService } from '@frok/voice-utils';

let fallbackClient: OpenAI | undefined;

function ensureFallbackClient(): OpenAI | undefined {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    return undefined;
  }

  if (!fallbackClient) {
    fallbackClient = new OpenAI({ apiKey });
  }

  return fallbackClient;
}

export class TTSService extends ElevenLabsTTSService {
  constructor() {
    super({
      fallbackClient: ensureFallbackClient(),
    });
  }
}
