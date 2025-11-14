declare module '@frok/voice-utils' {
  export interface ElevenLabsTTSOptions {
    apiKey?: string;
    voiceId?: string;
    modelId?: string;
    chunkSchedule?: number[];
    fallbackVoice?: string;
    fallbackModel?: string;
    fallbackClient?: unknown;
  }

  export class ElevenLabsTTSService {
    constructor(options?: ElevenLabsTTSOptions);
    synthesize(text: string, onAudioChunk: (chunk: Buffer) => void): Promise<void>;
    stop(): Promise<void>;
    cleanup(): void;
  }
}
