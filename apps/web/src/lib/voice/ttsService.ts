import OpenAI from 'openai';
import { ElevenLabsTTSService } from '@frok/voice-utils';

let sharedFallbackClient: OpenAI | undefined;

function getFallbackClient(): OpenAI | undefined {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    return undefined;
  }

  if (!sharedFallbackClient) {
    sharedFallbackClient = new OpenAI({ apiKey });
  }

  return sharedFallbackClient;
}

export class TTSService extends ElevenLabsTTSService {
  constructor() {
    super({
      fallbackClient: getFallbackClient(),
    });
  }
}
