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
  ProgressIndicator,
  type MetadataEvent,
  type ToolEvent,
  type HandoffEvent,
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
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // ===== Progress State =====
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [progressMetadata, setProgressMetadata] = useState<MetadataEvent | undefined>();
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffEvent[]>([]);
  const [progressError, setProgressError] = useState<string | undefined>();

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

    // Reset progress state
    setProgressPercent(0);
    setProgressStatus('');
    setProgressMessage('');
    setProgressMetadata(undefined);
    setToolEvents([]);
    setHandoffs([]);
    setProgressError(undefined);

    let assistantMessageId: string | null = null;

    try {
      // Create assistant message placeholder
      assistantMessageId = addMessage({
        threadId,
        role: 'assistant',
        content: '',
        source: 'text',
      });

      setStreamingMessageId(assistantMessageId);

      // Call enhanced agent API with progress streaming
      const response = await fetch('/api/agent/stream-with-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          input_as_text: content,
          images: fileUrls || [],
          user_model: selectedModel !== 'auto' ? selectedModel : undefined, // Send model preference
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE streaming with timeout detection
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        let lastChunkTime = Date.now();
        const TIMEOUT_MS = 30000; // 30 seconds timeout

        while (true) {
          // Check for timeout
          if (Date.now() - lastChunkTime > TIMEOUT_MS) {
            console.error('[Agent] Stream timeout - connection lost');
            toast.error('Connection timeout. Please try again.');
            throw new Error('Stream timeout');
          }

          const { done, value } = await reader.read();
          if (done) break;

          lastChunkTime = Date.now(); // Update last chunk time
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

                // Handle different event types from stream-with-progress
                switch (parsed.type) {
                  case 'metadata':
                    // Initial metadata (model, complexity, tools, routing)
                    setProgressMetadata(parsed.data as MetadataEvent);
                    setProgressPercent(10);
                    setProgressStatus('initialized');
                    setProgressMessage('Agent configured');
                    break;

                  case 'progress':
                    // Progress update (status message + optional percentage)
                    setProgressStatus(parsed.data.status);
                    setProgressMessage(parsed.data.message);
                    if (parsed.data.progress_percent !== undefined) {
                      setProgressPercent(parsed.data.progress_percent);
                    }
                    break;

                  case 'tool_start':
                    // Tool execution started
                    setToolEvents((prev) => [
                      ...prev,
                      {
                        id: `${parsed.data.tool_name}-${Date.now()}`,
                        tool_name: parsed.data.tool_name,
                        tool_description: parsed.data.tool_description,
                        timestamp: parsed.timestamp,
                        success: undefined, // Pending
                      },
                    ]);
                    break;

                  case 'tool_end':
                    // Tool execution completed
                    setToolEvents((prev) =>
                      prev.map((event) =>
                        event.tool_name === parsed.data.tool_name && event.success === undefined
                          ? {
                              ...event,
                              success: parsed.data.success,
                              duration_ms: parsed.data.duration_ms,
                            }
                          : event
                      )
                    );
                    break;

                  case 'handoff':
                    // Agent handoff (orchestrator routing)
                    setHandoffs((prev) => [
                      ...prev,
                      {
                        from_agent: parsed.data.from_agent,
                        to_agent: parsed.data.to_agent,
                        reason: parsed.data.reason,
                        timestamp: parsed.timestamp,
                      },
                    ]);
                    break;

                  case 'delta':
                    // Streaming text chunk
                    if (parsed.data.content && !parsed.data.done) {
                      appendStreamingContent(threadId, assistantMessageId, parsed.data.content);
                    }
                    break;

                  case 'done':
                    // Final response complete
                    setProgressPercent(100);
                    setProgressStatus('complete');
                    setProgressMessage('Response complete');
                    break;

                  case 'error':
                    // Error occurred
                    setProgressError(parsed.data.error);
                    setProgressStatus('error');
                    console.error('[Agent] Stream error:', parsed.data);
                    toast.error(`Agent error: ${parsed.data.error}`);
                    throw new Error(parsed.data.error);

                  default:
                    // Legacy support for old format (smart-stream fallback)
                    if (parsed.delta && !parsed.done) {
                      appendStreamingContent(threadId, assistantMessageId, parsed.delta);
                    }
                    if (parsed.metadata) {
                      console.log('[Agent] Metadata:', parsed.metadata);
                    }
                    if (parsed.error) {
                      console.error('[Agent] Error:', parsed.error);
                      toast.error(`Agent error: ${parsed.error}`);
                      throw new Error(parsed.error);
                    }
                    break;
                }
              } catch (parseError) {
                // Skip invalid JSON
                if (parseError instanceof Error && !parseError.message.includes('Unexpected')) {
                  console.warn('[Agent] Failed to parse SSE data:', data, parseError);
                }
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
      if (assistantMessageId) {
        setStreamingMessageId(null);
      }
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
              {/* Model Selector */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface/80 transition focus:outline-none focus:ring-2 focus:ring-primary"
                title="Select AI Model"
              >
                <option value="auto">🤖 Auto (Smart Routing)</option>
                <optgroup label="GPT-5 Family">
                  <option value="gpt-5">⚡ GPT-5 (Main Model)</option>
                  <option value="gpt-5-mini">🎯 GPT-5 Mini (Balanced)</option>
                  <option value="gpt-5-nano">💨 GPT-5 Nano (Fast)</option>
                  <option value="gpt-5-thinking">🧠 GPT-5 Thinking (Reasoning)</option>
                  <option value="gpt-5-pro">🚀 GPT-5 Pro (Enhanced)</option>
                </optgroup>
              </select>

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
            <>
              {/* Progress Indicator - Shown during streaming */}
              {isStreaming && progressMessage && (
                <div className="mb-4 px-4">
                  <ProgressIndicator
                    percent={progressPercent}
                    status={progressStatus}
                    message={progressMessage}
                    metadata={progressMetadata}
                    toolEvents={toolEvents}
                    handoffs={handoffs}
                    isComplete={progressPercent >= 100}
                    hasError={!!progressError}
                    errorMessage={progressError}
                  />
                </div>
              )}

              <MessageList
                threadId={activeThread.id}
                isCompact={false}
                isLoading={false}
              />
            </>
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
