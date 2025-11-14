declare module 'openai' {
  interface ClientOptions {
    apiKey?: string;
    baseURL?: string;
  }

  interface SpeechCreateParams {
    model: string;
    voice?: string;
    input: string;
  }

  interface SpeechResponse {
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  interface ResponseStreamEvent {
    type: string;
    [key: string]: unknown;
  }

  interface ResponseStream extends AsyncIterable<ResponseStreamEvent> {}

  interface ResponseClient {
    create(params: Record<string, unknown>): Promise<any>;
    stream(
      params: Record<string, unknown>,
      options?: { signal?: AbortSignal }
    ): Promise<ResponseStream> | ResponseStream;
  }

  interface ChatCompletionsClient {
    create(
      params: Record<string, unknown>,
      options?: { signal?: AbortSignal }
    ): Promise<any>;
    stream?(
      params: Record<string, unknown>,
      options?: { signal?: AbortSignal }
    ): Promise<AsyncIterable<Record<string, unknown>>> | AsyncIterable<Record<string, unknown>>;
  }

  interface ChatClient {
    completions: ChatCompletionsClient;
  }

  interface AudioClient {
    speech: {
      create(params: SpeechCreateParams): Promise<SpeechResponse>;
    };
    transcriptions: {
      create(params: Record<string, unknown>): Promise<any>;
    };
  }

  interface EmbeddingsClient {
    create(params: Record<string, unknown>): Promise<any>;
  }

  export default class OpenAI {
    constructor(options?: ClientOptions);
    audio: AudioClient;
    responses: ResponseClient;
    chat: ChatClient;
    embeddings: EmbeddingsClient;
    beta: Record<string, unknown>;
  }
}

declare module 'openai/uploads' {
  export function toFile(data: ArrayBuffer | Buffer | Blob, filename?: string): Promise<any>;
}

declare module 'ws' {
  export type RawData = string | Buffer | ArrayBuffer | Buffer[];

  export interface ClientOptions {
    headers?: Record<string, string>;
  }

  export default class WebSocket {
    static readonly CONNECTING: 0;
    static readonly OPEN: 1;
    static readonly CLOSING: 2;
    static readonly CLOSED: 3;

    readyState: 0 | 1 | 2 | 3;

    constructor(address: string, options?: ClientOptions);

    send(data: string | Buffer): void;
    close(): void;

    on(event: 'open', listener: () => void): this;
    on(event: 'message', listener: (data: RawData) => void): this;
    on(event: 'error', listener: (error: unknown) => void): this;
    on(event: 'close', listener: () => void): this;
    once(event: 'open', listener: () => void): this;
    once(event: 'error', listener: (error: unknown) => void): this;
    once(event: 'close', listener: () => void): this;
    off(event: 'open' | 'message' | 'error' | 'close', listener: (...args: any[]) => void): this;
  }
}
