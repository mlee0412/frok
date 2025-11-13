'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  ChatLayout,
  ChatHeader,
  ChatContent,
  ChatFooter,
  MessageList,
  ChatInput,
} from '@/components/chat';
import { useUnifiedChatStore, useActiveThread, useThreadMessages } from '@/store/unifiedChatStore';
import { useToast } from '@frok/ui';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

// ============================================================================
// Dynamic Imports (Agent-Specific Modals)
// ============================================================================

const TTSSettingsModal = dynamic(
  () => import('@/components/TTSSettings').then((m) => ({ default: m.TTSSettingsModal })),
  { ssr: false }
);

const AgentMemoryModal = dynamic(
  () => import('@/components/AgentMemoryModal').then((m) => ({ default: m.AgentMemoryModal })),
  { ssr: false }
);

const UserMemoriesModal = dynamic(
  () => import('@/components/UserMemoriesModal').then((m) => ({ default: m.UserMemoriesModal })),
  { ssr: false }
);

// ============================================================================
// Agent Page Component
// ============================================================================

/**
 * Agent Page - AI Assistant Chat Interface
 *
 * Features:
 * - Smart agent orchestration with tool selection
 * - TTS (Text-to-Speech) settings
 * - Agent memory management
 * - User memories management
 * - Auto-title generation
 * - Export conversation
 * - Streaming responses with tool call display
 */
export default function AgentPage() {
  const toast = useToast();

  // ===== Store State =====
  const activeThread = useActiveThread();
  const messages = useThreadMessages(activeThread?.id ?? null);
  const createThread = useUnifiedChatStore((state) => state.createThread);
  const setActiveThread = useUnifiedChatStore((state) => state.setActiveThread);
  const updateThread = useUnifiedChatStore((state) => state.updateThread);
  const addMessage = useUnifiedChatStore((state) => state.addMessage);
  const setStreamingMessageId = useUnifiedChatStore((state) => state.setStreamingMessageId);
  const appendStreamingContent = useUnifiedChatStore((state) => state.appendStreamingContent);
  const toggleVoiceSheet = useUnifiedChatStore((state) => state.toggleVoiceSheet);
  const isVoiceSheetOpen = useUnifiedChatStore((state) => state.isVoiceSheetOpen);

  // ===== TTS Hooks =====
  const { settings: ttsSettings, voices, updateSettings: updateTTS } = useTextToSpeech();

  // ===== Local State =====
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showUserMemories, setShowUserMemories] = useState(false);

  // ===== Message Sending =====

  const handleSendMessage = useCallback(
    async (content: string, fileUrls?: string[]) => {
      if (!content.trim() && !fileUrls?.length) return;

      let threadId = activeThread?.id;

      // Create thread if none active
      if (!threadId) {
        threadId = createThread('New Chat', 'agent');
        setActiveThread(threadId);
      }

      try {
        // Add user message
        addMessage({
          threadId,
          role: 'user',
          content,
          source: 'text',
          fileUrls,
        });

        // Start streaming response
        await sendMessageWithStreaming(threadId, content, fileUrls || []);

        // Auto-title generation after 3 messages
        const messageCount = messages.length + 2; // +2 for user + assistant messages just added
        if (messageCount === 3) {
          generateThreadTitle(threadId, content);
        }

        toast.success('Message sent');
      } catch (error: unknown) {
        console.error('[AgentPage] Failed to send message:', error);
        toast.error('Failed to send message');
        throw error;
      }
    },
    [activeThread, createThread, setActiveThread, addMessage, messages.length, toast]
  );

  // ===== Streaming Logic =====

  const sendMessageWithStreaming = async (
    threadId: string,
    content: string,
    fileUrls: string[]
  ) => {
    setIsStreaming(true);

    try {
      // Create assistant message placeholder
      const assistantMessageId = addMessage({
        threadId,
        role: 'assistant',
        content: '',
        source: 'text',
      });

      setStreamingMessageId(assistantMessageId);

      // Call agent API with streaming
      const response = await fetch('/api/agent/smart-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          message: content,
          fileUrls,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  appendStreamingContent(threadId, assistantMessageId, parsed.content);
                }
                // Handle tool calls, metadata, etc.
                if (parsed.toolCalls) {
                  // Update message with tool call metadata
                  // (MessageCard already handles display)
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } else {
        // Handle non-streaming response
        const json = await response.json();
        if (json.ok && json.message) {
          appendStreamingContent(threadId, assistantMessageId, json.message.content);
        }
      }

      setStreamingMessageId(null);
    } finally {
      setIsStreaming(false);
    }
  };

  // ===== Auto-Title Generation =====

  const generateThreadTitle = async (threadId: string, firstMessage: string) => {
    try {
      const response = await fetch('/api/agent/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: firstMessage }),
      });

      if (response.ok) {
        const { title } = await response.json();
        if (title) {
          updateThread(threadId, { title });
        }
      }
    } catch (error) {
      console.error('[AgentPage] Failed to generate title:', error);
      // Non-critical, don't show error to user
    }
  };

  // ===== Voice Toggle =====

  const handleVoiceToggle = useCallback(() => {
    toggleVoiceSheet();
  }, [toggleVoiceSheet]);

  // ===== Render =====

  const threadTitle = activeThread?.title || 'Agent Chat';
  const threadSubtitle = activeThread
    ? `${activeThread.messageCount || 0} messages`
    : 'AI assistant with tool access';

  return (
    <>
      <ChatLayout>
        {/* Header */}
        <ChatHeader
          title={threadTitle}
          subtitle={threadSubtitle}
          showBack={false}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTTSSettings(true)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface/80 transition"
                title="TTS Settings"
              >
                🔊 TTS
              </button>
              <button
                onClick={() => setShowMemoryModal(true)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface/80 transition"
                title="Agent Memory"
              >
                🧠 Memory
              </button>
              <button
                onClick={() => setShowUserMemories(true)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface/80 transition"
                title="User Memories"
              >
                👤 Memories
              </button>
            </div>
          }
        />

        {/* Messages */}
        <ChatContent>
          {activeThread ? (
            <MessageList
              threadId={activeThread.id}
              isCompact={false}
              isLoading={false}
            />
          ) : (
            <EmptyState
              onCreateThread={() => {
                const threadId = createThread('New Chat', 'agent');
                setActiveThread(threadId);
              }}
            />
          )}
        </ChatContent>

        {/* Input */}
        <ChatFooter>
          {activeThread && (
            <ChatInput
              threadId={activeThread.id}
              onSendMessage={handleSendMessage}
              onVoiceToggle={handleVoiceToggle}
              isVoiceActive={isVoiceSheetOpen}
              isLoading={isStreaming}
              placeholder="Ask the agent anything..."
              maxLength={4000}
              showCharCount={false}
            />
          )}
        </ChatFooter>
      </ChatLayout>

      {/* Agent-Specific Modals */}
      {showTTSSettings && (
        <TTSSettingsModal
          settings={ttsSettings}
          voices={voices}
          onUpdate={updateTTS}
          onClose={() => setShowTTSSettings(false)}
        />
      )}

      {showMemoryModal && (
        <AgentMemoryModal
          agentName="default"
          onClose={() => setShowMemoryModal(false)}
        />
      )}

      {showUserMemories && (
        <UserMemoriesModal onClose={() => setShowUserMemories(false)} />
      )}
    </>
  );
}

// ============================================================================
// EmptyState Component
// ============================================================================

interface EmptyStateProps {
  onCreateThread: () => void;
}

function EmptyState({ onCreateThread }: EmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">🤖</div>
        <h2 className="mb-3 text-2xl font-semibold text-foreground">
          Welcome to Agent Chat
        </h2>
        <p className="mb-6 text-sm text-foreground/60">
          Your AI assistant with access to powerful tools and memory
        </p>
        <button
          onClick={onCreateThread}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <span>✨</span>
          <span>Start Conversation</span>
        </button>

        {/* Features */}
        <div className="mt-12 space-y-3">
          <div className="text-xs font-medium text-foreground/50">Agent Capabilities:</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCard
              icon="🛠️"
              title="Tool Access"
              description="Weather, calendar, smart home control"
            />
            <FeatureCard
              icon="🧠"
              title="Memory"
              description="Remembers context across conversations"
            />
            <FeatureCard
              icon="🔊"
              title="Text-to-Speech"
              description="Listen to responses with TTS"
            />
            <FeatureCard
              icon="📄"
              title="Document Export"
              description="Save conversations as markdown"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FeatureCard Component
// ============================================================================

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4 text-left backdrop-blur-sm">
      <div className="mb-2 text-2xl">{icon}</div>
      <div className="mb-1 text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs text-foreground/60">{description}</div>
    </div>
  );
}
