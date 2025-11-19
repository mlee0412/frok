/**
 * Voice Assistant Page
 * Real-time voice conversation interface
 */

'use client';

import { VoiceInterfaceContent } from '@/components/voice/VoiceInterface';
import { useRealtimeAgent } from '@/hooks/useRealtimeAgent';
import { useActiveThread } from '@/store/unifiedChatStore';
import { useRouter } from 'next/navigation';

export default function VoicePage() {
  const activeThread = useActiveThread();
  const router = useRouter();
  const { state, toggleSession, interrupt } = useRealtimeAgent(activeThread?.id);

  // Map state to UI mode
  const getMode = () => {
    if (state.error) return 'error';
    if (state.isConnecting) return 'processing';
    if (state.isSpeaking) return 'speaking';
    if (state.isListening) return 'listening';
    return 'idle';
  };

  return (
    <div className="h-screen w-full bg-background">
      <VoiceInterfaceContent
        mode={getMode()}
        connected={state.isConnected}
        transcript=""
        response=""
        error={state.error}
        onClose={() => router.back()}
        onToggleVoice={toggleSession}
        onInterrupt={interrupt}
      />
    </div>
  );
}
