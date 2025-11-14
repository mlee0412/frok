import { WebSocketManager } from '@/lib/voice/websocketManager';
import { AudioStreamer, base64ToUint8Array } from '@/components/voice/AudioStreamer';
import { VoiceActivityDetector } from '@/components/voice/VoiceActivityDetector';
import { useUnifiedChatStore } from '@/store/unifiedChatStore';
import type { VoiceMessage } from '@/types/voice';

type StopOptions = {
  disconnect?: boolean;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read audio data'));
        return;
      }
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to encode audio chunk'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to encode audio chunk'));
    reader.readAsDataURL(blob);
  });
}

class VoicePipeline {
  private wsManager: WebSocketManager | null = null;
  private audioStreamer: AudioStreamer | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private vad: VoiceActivityDetector | null = null;
  private initialized = false;
  private starting = false;

  async start(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Voice pipeline requires a browser environment');
    }

    if (this.starting) {
      return;
    }

    const store = useUnifiedChatStore.getState();

    if (store.voiceConnecting) {
      return;
    }

    this.starting = true;
    store.setVoiceConnecting(true);
    store.setVoiceError(null);

    try {
      await this.ensureInitialized();

      store.clearVoiceTranscript();
      store.clearVoiceResponse();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      this.mediaStream = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      this.audioContext = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      const vadSensitivity = store.vadSensitivity ?? 0.01;
      this.vad = new VoiceActivityDetector(audioContext, {
        threshold: vadSensitivity,
        onSpeechStart: () => {
          const current = useUnifiedChatStore.getState();
          if (current.voiceMode === 'speaking') {
            this.interrupt();
          }
        },
      });
      source.connect(this.vad.analyser);

      await this.wsManager!.connect();

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 32000,
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        try {
          if (!event.data || event.data.size === 0) return;
          const base64 = await blobToBase64(event.data);
          this.wsManager?.send({ type: 'audio_input', data: base64 });
        } catch (error) {
          console.error('[VoicePipeline] Failed to process audio chunk:', error);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[VoicePipeline] MediaRecorder error:', event);
        const current = useUnifiedChatStore.getState();
        current.setVoiceError('Audio capture error');
        current.setVoiceMode('error');
        void this.stop();
      };

      this.mediaRecorder.start(300);
      store.setVoiceMode('listening');
    } catch (error) {
      console.error('[VoicePipeline] Failed to start voice session:', error);
      store.setVoiceError(
        error instanceof Error ? error.message : 'Failed to start voice session'
      );
      store.setVoiceMode('error');
      await this.stop();
    } finally {
      this.starting = false;
      store.setVoiceConnecting(false);
    }
  }

  async stop(options: StopOptions = {}): Promise<void> {
    const { disconnect = false } = options;
    const store = useUnifiedChatStore.getState();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
    }

    if (this.audioContext) {
      await this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }

    if (disconnect) {
      this.wsManager?.disconnect();
      store.setVoiceConnected(false);
    } else if (this.wsManager) {
      this.wsManager.send({ type: 'end_utterance' });
    }

    this.audioStreamer?.stop();

    store.setVoiceMode('idle');
    store.clearVoiceTranscript();
    store.clearVoiceResponse();
  }

  interrupt(): void {
    this.wsManager?.send({ type: 'interrupt' });
    this.audioStreamer?.stop();
    const store = useUnifiedChatStore.getState();
    store.clearVoiceResponse();
    store.setVoiceMode('listening');
  }

  async cleanup(): Promise<void> {
    await this.stop({ disconnect: true });
    this.audioStreamer?.destroy();
    this.audioStreamer = null;
    this.wsManager = null;
    this.initialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const store = useUnifiedChatStore.getState();

    this.audioStreamer = new AudioStreamer({
      mimeType: 'audio/mpeg',
      onPlaybackStart: () => store.setVoiceMode('speaking'),
      onPlaybackEnd: () => {
        const current = useUnifiedChatStore.getState();
        if (current.voiceMode === 'speaking') {
          current.setVoiceMode('idle');
        }
      },
      onError: (error) => {
        console.error('[VoicePipeline] Audio playback error:', error);
        const current = useUnifiedChatStore.getState();
        current.setVoiceError('Audio playback failed');
        current.setVoiceMode('error');
      },
    });

    this.wsManager = new WebSocketManager({
      url: '/api/voice/stream',
      onMessage: this.handleMessage,
      onOpen: () => {
        const current = useUnifiedChatStore.getState();
        current.setVoiceConnected(true);
        current.setVoiceError(null);
      },
      onClose: () => {
        const current = useUnifiedChatStore.getState();
        current.setVoiceConnected(false);
      },
      onError: (event) => {
        console.error('[VoicePipeline] WebSocket error:', event);
        const current = useUnifiedChatStore.getState();
        current.setVoiceError('Voice connection error');
        current.setVoiceMode('error');
        current.setVoiceConnected(false);
      },
    });

    this.initialized = true;
  }

  private handleMessage = (message: VoiceMessage) => {
    const store = useUnifiedChatStore.getState();

    switch (message.type) {
      case 'stt_result':
        store.setVoiceTranscript(message.text);
        store.setVoiceMode('processing');
        break;
      case 'llm_token':
        store.appendVoiceResponse(message.token);
        break;
      case 'audio_chunk':
        if (this.audioStreamer) {
          const audioData = base64ToUint8Array(message.data);
          this.audioStreamer.appendAudio(audioData);
        }
        break;
      case 'response_complete': {
        const threadId = store.activeThreadId;
        if (threadId) {
          store.finalizeVoiceMessage(threadId);
        }
        this.audioStreamer?.stop();
        store.setVoiceMode('idle');
        break;
      }
      case 'error':
        store.setVoiceError(message.error);
        store.setVoiceMode('error');
        break;
      default:
        break;
    }
  };
}

let voicePipeline: VoicePipeline | null = null;

function getVoicePipeline(): VoicePipeline {
  if (!voicePipeline) {
    voicePipeline = new VoicePipeline();
  }
  return voicePipeline;
}

export async function startVoicePipeline() {
  await getVoicePipeline().start();
}

export async function stopVoicePipeline(options?: StopOptions) {
  await getVoicePipeline().stop(options);
}

export function interruptVoicePipeline() {
  getVoicePipeline().interrupt();
}

export async function destroyVoicePipeline() {
  if (voicePipeline) {
    await voicePipeline.cleanup();
    voicePipeline = null;
  }
}
