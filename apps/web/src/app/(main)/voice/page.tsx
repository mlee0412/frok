/**
 * Voice Assistant Page
 * Real-time voice conversation interface
 */

import { VoiceAssistant } from '@/components/voice/VoiceAssistant';

export const metadata = {
  title: 'Voice Assistant | FROK',
  description: 'Real-time voice conversation with AI assistant',
};

export default function VoicePage() {
  return (
    <div className="h-screen">
      <VoiceAssistant />
    </div>
  );
}
