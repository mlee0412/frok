'use client';

import { useState, useCallback } from 'react';
import {
  ChatLayout,
  ChatHeader,
  ChatContent,
  ChatFooter,
  MessageList,
  ChatInput,
} from '@/components/chat';
import { useUnifiedChatStore, useActiveThread } from '@/store/unifiedChatStore';
import { useCreateMessage, useUpdateThread } from '@/hooks/queries/useUnifiedChat';
import { useToast } from '@frok/ui';

// ============================================================================
// Integrated Chat Page
// ============================================================================

/**
 * Chat Page - Fully integrated multimodal chat interface
 *
 * Features:
 * - Complete layout with sidebar, messages, and input
 * - Voice integration via VoiceSheet
 * - Mobile-responsive with bottom sheet
 * - Real-time message streaming
 * - File upload support
 * - Optimistic updates via TanStack Query
 * - Draft message persistence
 */

export default function ChatPage() {
  const toast = useToast();

  // Store state
  const activeThread = useActiveThread();
  const createThread = useUnifiedChatStore((state) => state.createThread);
  const setActiveThread = useUnifiedChatStore((state) => state.setActiveThread);
  const toggleVoiceSheet = useUnifiedChatStore((state) => state.toggleVoiceSheet);
  const isVoiceSheetOpen = useUnifiedChatStore((state) => state.isVoiceSheetOpen);

  // Local state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Mutations
  const createMessageMutation = useCreateMessage();
  const updateThreadMutation = useUpdateThread();

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if (!content.trim() && !files?.length) return;

      let threadId = activeThread?.id;

      // Create thread if none active
      if (!threadId) {
        threadId = createThread('New Chat', 'default');
        setActiveThread(threadId);
      }

      try {
        // Handle file uploads first if present
        let fileUrls: string[] = [];
        if (files && files.length > 0) {
          fileUrls = await uploadFiles(files);
        }

        // Send message via API with streaming support
        await sendMessageWithStreaming(threadId, content, fileUrls);

        // Note: Thread's lastMessageAt is updated automatically by the API

        toast.success('Message sent');
      } catch (error: unknown) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
        throw error;
      }
    },
    [activeThread, createThread, setActiveThread, updateThreadMutation, toast]
  );

  // Send message with streaming support
  const sendMessageWithStreaming = async (
    threadId: string,
    content: string,
    fileUrls?: string[]
  ) => {
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          content,
          fileUrls,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Check if response is streaming (text/event-stream)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        let accumulatedContent = '';

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
                  accumulatedContent += parsed.content;
                  setStreamingContent(accumulatedContent);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        // Add final message to store
        createMessageMutation.mutate({
          threadId,
          message: {
            role: 'assistant',
            content: accumulatedContent,
            timestamp: Date.now(),
          },
        });
      } else {
        // Handle non-streaming response
        const json = await response.json();
        if (json.ok && json.message) {
          createMessageMutation.mutate({
            threadId,
            message: json.message,
          });
        }
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  // Upload files to server
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await fetch('/api/chat/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload files');
    }

    const json = await response.json();
    return json.urls || [];
  };

  // Handle voice toggle
  const handleVoiceToggle = useCallback(() => {
    toggleVoiceSheet();
  }, [toggleVoiceSheet]);

  // Get thread title and subtitle
  const threadTitle = activeThread?.title || 'Select a conversation';
  const threadSubtitle = activeThread
    ? `${activeThread.messageCount || 0} messages`
    : 'Choose from sidebar or start new';

  return (
    <ChatLayout>
      {/* Header */}
      <ChatHeader
        title={threadTitle}
        subtitle={threadSubtitle}
        showBack={false}
        actions={
          <div className="flex items-center gap-2">
            {/* Additional actions can go here */}
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
            streamingContent={streamingContent}
          />
        ) : (
          <EmptyState onCreateThread={() => {
            const threadId = createThread('New Chat', 'default');
            setActiveThread(threadId);
          }} />
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
            placeholder="Type a message..."
            maxLength={4000}
            showCharCount={false}
          />
        )}
      </ChatFooter>
    </ChatLayout>
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
        <div className="mb-6 text-6xl">💬</div>
        <h2 className="mb-3 text-2xl font-semibold text-foreground">
          Welcome to FROK Chat
        </h2>
        <p className="mb-6 text-sm text-foreground/60">
          Start a new conversation or select an existing thread from the sidebar
        </p>
        <button
          onClick={onCreateThread}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <span>✨</span>
          <span>Start New Chat</span>
        </button>

        {/* Suggested Features */}
        <div className="mt-12 space-y-3">
          <div className="text-xs font-medium text-foreground/50">
            What you can do:
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCard
              icon="🎤"
              title="Voice Chat"
              description="Talk naturally with AI assistant"
            />
            <FeatureCard
              icon="📎"
              title="File Upload"
              description="Share images and documents"
            />
            <FeatureCard
              icon="🧠"
              title="Smart Assistant"
              description="GPT-5 powered conversations"
            />
            <FeatureCard
              icon="⚡"
              title="Fast & Smooth"
              description="Optimized for performance"
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
