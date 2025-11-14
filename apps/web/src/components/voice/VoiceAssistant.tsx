'use client';

import { useEffect } from 'react';
import { Mic, MicOff, VolumeX } from 'lucide-react';
import { Button, Card } from '@frok/ui';
import {
  useUnifiedChatStore,
  useVoiceState,
  useThreadMessages,
} from '@/store/unifiedChatStore';
import {
  startVoicePipeline,
  stopVoicePipeline,
  interruptVoicePipeline,
  destroyVoicePipeline,
} from '@/lib/voice/voicePipeline';

export function VoiceAssistant() {
  const { mode, connected, transcript, response, connecting, error } = useVoiceState();
  const activeThreadId = useUnifiedChatStore((state) => state.activeThreadId);
  const threadMessages = useThreadMessages(activeThreadId);

  useEffect(() => {
    return () => {
      void destroyVoicePipeline();
    };
  }, []);

  const handleStart = async () => {
    await startVoicePipeline();
  };

  const handleStop = async () => {
    await stopVoicePipeline();
  };

  const handleInterrupt = () => {
    interruptVoicePipeline();
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with status */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                connected ? 'bg-success animate-pulse' : 'bg-danger'
              }`}
            />
            <span className="text-sm text-foreground/70">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="text-sm font-medium text-foreground">
            {connecting && '🔄 Connecting...'}
            {!connecting && mode === 'listening' && '🎤 Listening...'}
            {!connecting && mode === 'processing' && '🤔 Thinking...'}
            {!connecting && mode === 'speaking' && '🗣️ Speaking...'}
            {!connecting && mode === 'idle' && '💤 Idle'}
            {!connecting && mode === 'error' && '⚠️ Error'}
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded bg-danger/10 p-2 text-sm text-danger">
            {error}
          </div>
        )}
      </div>

      {/* Conversation transcript */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Show finalized thread messages */}
          {threadMessages
            .filter((msg) => msg.source === 'voice')
            .map((msg) => (
              <Card
                key={msg.id}
                className={`p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-foreground/60">
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">{msg.content}</p>
              </Card>
            ))}

          {/* Current transcript (user speaking) */}
          {transcript && mode === 'processing' && (
            <Card className="p-3 bg-primary/10 border-primary/20">
              <div className="text-xs text-foreground/60">You</div>
              <p className="mt-1 text-sm text-foreground">{transcript}</p>
            </Card>
          )}

          {/* Current response (assistant speaking) */}
          {response && (
            <Card className="p-3 bg-surface border-border">
              <div className="text-xs text-foreground/60">Assistant</div>
              <p className="mt-1 text-sm text-foreground">{response}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-center gap-4">
          {mode === 'idle' || mode === 'error' ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleStart}
              disabled={!connected || connecting}
              className="gap-2"
            >
              <Mic className="h-5 w-5" />
              {connecting ? 'Connecting' : 'Start Listening'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={handleStop}
                className="gap-2"
              >
                <MicOff className="h-5 w-5" />
                Stop
              </Button>

              {mode === 'speaking' && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleInterrupt}
                  className="gap-2"
                >
                  <VolumeX className="h-5 w-5" />
                  Interrupt
                </Button>
              )}
            </>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-foreground/50">
          {mode === 'idle' && 'Click to start voice conversation'}
          {mode === 'listening' && 'Speak naturally, pause when done'}
          {mode === 'processing' && 'Processing your request...'}
          {mode === 'speaking' && 'You can interrupt by speaking'}
        </p>
      </div>
    </div>
  );
}
