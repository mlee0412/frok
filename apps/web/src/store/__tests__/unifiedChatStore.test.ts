import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useUnifiedChatStore,
  useActiveThread,
  useThreadMessages,
  useVoiceState,
} from '../unifiedChatStore';

describe('unifiedChatStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useUnifiedChatStore.getState().reset();
    });
  });

  describe('Thread Management', () => {
    it('should create a new thread', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
      });

      expect(result.current.threads).toHaveLength(1);
      expect(result.current.threads[0]!.title).toBe('Test Thread');
      expect(result.current.threads[0]!.agentId).toBe('agent-1');
      expect(result.current.activeThreadId).toBe(threadId!);
    });

    it('should delete a thread and its messages', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Test message',
        });
      });

      expect(result.current.threads).toHaveLength(1);
      expect(result.current.messages[threadId!]).toHaveLength(1);

      act(() => {
        result.current.deleteThread(threadId!);
      });

      expect(result.current.threads).toHaveLength(0);
      expect(result.current.messages[threadId!]).toBeUndefined();
      expect(result.current.activeThreadId).toBeNull();
    });

    it('should update thread properties', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      act(() => {
        threadId = result.current.createThread('Original Title', 'agent-1');
      });

      act(() => {
        result.current.updateThread(threadId!, {
          title: 'Updated Title',
          tags: ['important'],
          pinned: true,
        });
      });

      const thread = result.current.threads.find((t) => t.id === threadId!);
      expect(thread?.title).toBe('Updated Title');
      expect(thread?.tags).toEqual(['important']);
      expect(thread?.pinned).toBe(true);
    });

    it('should archive a thread', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        result.current.archiveThread(threadId!);
      });

      const thread = result.current.threads.find((t) => t.id === threadId!);
      expect(thread?.archived).toBe(true);
    });

    it('should pin/unpin a thread', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        result.current.pinThread(threadId!, true);
      });

      let thread = result.current.threads.find((t) => t.id === threadId!);
      expect(thread?.pinned).toBe(true);

      act(() => {
        result.current.pinThread(threadId!, false);
      });

      thread = result.current.threads.find((t) => t.id === threadId!);
      expect(thread?.pinned).toBe(false);
    });
  });

  describe('Message Management', () => {
    it('should add a message to a thread', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      let messageId: string;

      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        messageId = result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Hello!',
        });
      });

      expect(result.current.messages[threadId!]).toHaveLength(1);
      expect(result.current.messages[threadId!]![0]!.content).toBe('Hello!');
      expect(result.current.messages[threadId!]![0]!.id).toBe(messageId!);
    });

    it('should update a message', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      let messageId: string;

      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        messageId = result.current.addMessage({
          threadId: threadId!,
          role: 'assistant',
          content: 'Original content',
        });
      });

      act(() => {
        result.current.updateMessage(threadId!, messageId!, {
          content: 'Updated content',
        });
      });

      expect(result.current.messages[threadId!]![0]!.content).toBe('Updated content');
    });

    it('should delete a message', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      let messageId: string;

      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        messageId = result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Test',
        });
      });

      expect(result.current.messages[threadId!]).toHaveLength(1);

      act(() => {
        result.current.deleteMessage(threadId!, messageId!);
      });

      expect(result.current.messages[threadId!]).toHaveLength(0);
    });

    it('should clear all messages in a thread', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;

      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Message 1',
        });
        result.current.addMessage({
          threadId: threadId!,
          role: 'assistant',
          content: 'Message 2',
        });
      });

      expect(result.current.messages[threadId!]).toHaveLength(2);

      act(() => {
        result.current.clearMessages(threadId!);
      });

      expect(result.current.messages[threadId!]).toHaveLength(0);
    });

    it('should handle streaming message updates', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      let messageId: string;

      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        messageId = result.current.addMessage({
          threadId: threadId!,
          role: 'assistant',
          content: '',
        });
        result.current.setStreamingMessageId(messageId!);
      });

      expect(result.current.streamingMessageId).toBe(messageId!);

      act(() => {
        result.current.appendStreamingContent(threadId!, messageId!, 'Hello');
        result.current.appendStreamingContent(threadId!, messageId!, ' ');
        result.current.appendStreamingContent(threadId!, messageId!, 'World');
      });

      expect(result.current.messages[threadId!]![0]!.content).toBe('Hello World');

      act(() => {
        result.current.setStreamingMessageId(null);
      });

      expect(result.current.streamingMessageId).toBeNull();
    });

    it('should add metadata to messages', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;

      act(() => {
        threadId = result.current.createThread('Test Thread', 'agent-1');
        result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Test',
          source: 'voice',
          fileUrls: ['https://example.com/file.pdf'],
          metadata: {
            voiceTranscription: 'Original transcription',
            customField: 'value',
          },
        });
      });

      const message = result.current.messages[threadId!]![0]!;
      expect(message.source).toBe('voice');
      expect(message.fileUrls).toEqual(['https://example.com/file.pdf']);
      expect(message.metadata?.voiceTranscription).toBe('Original transcription');
      expect((message.metadata as any)?.customField).toBe('value');
    });
  });

  describe('Voice State Management', () => {
    it('should update voice mode', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      act(() => {
        result.current.setVoiceMode('listening');
      });

      expect(result.current.voiceMode).toBe('listening');

      act(() => {
        result.current.setVoiceMode('processing');
      });

      expect(result.current.voiceMode).toBe('processing');
    });

    it('should manage voice transcript', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      act(() => {
        result.current.setVoiceTranscript('Hello from voice');
      });

      expect(result.current.voiceTranscript).toBe('Hello from voice');

      act(() => {
        result.current.clearVoiceTranscript();
      });

      expect(result.current.voiceTranscript).toBe('');
    });

    it('should manage voice response streaming', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      act(() => {
        result.current.appendVoiceResponse('Hello');
        result.current.appendVoiceResponse(' ');
        result.current.appendVoiceResponse('there');
      });

      expect(result.current.voiceResponse).toBe('Hello there');

      act(() => {
        result.current.clearVoiceResponse();
      });

      expect(result.current.voiceResponse).toBe('');
    });

    it('should finalize voice message and save to thread', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;

      act(() => {
        threadId = result.current.createThread('Voice Thread', 'agent-1');
        result.current.setVoiceTranscript('User said this');
        result.current.appendVoiceResponse('Assistant responded');
        result.current.setVoiceMode('speaking');
      });

      act(() => {
        result.current.finalizeVoiceMessage(threadId!);
      });

      // Should have saved both user and assistant messages
      expect(result.current.messages[threadId!]).toHaveLength(2);
      expect(result.current.messages[threadId!]![0]!.content).toBe('User said this');
      expect(result.current.messages[threadId!]![0]!.role).toBe('user');
      expect(result.current.messages[threadId!]![0]!.source).toBe('voice');
      expect(result.current.messages[threadId!]![1]!.content).toBe('Assistant responded');
      expect(result.current.messages[threadId!]![1]!.role).toBe('assistant');
      expect(result.current.messages[threadId!]![1]!.source).toBe('voice');

      // Voice state should be cleared
      expect(result.current.voiceTranscript).toBe('');
      expect(result.current.voiceResponse).toBe('');
      expect(result.current.voiceMode).toBe('idle');
    });

    it('should update VAD sensitivity within bounds', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      act(() => {
        result.current.setVadSensitivity(0.05);
      });

      expect(result.current.vadSensitivity).toBe(0.05);

      // Test upper bound
      act(() => {
        result.current.setVadSensitivity(0.5); // Should clamp to 0.1
      });

      expect(result.current.vadSensitivity).toBe(0.1);

      // Test lower bound
      act(() => {
        result.current.setVadSensitivity(0.0001); // Should clamp to 0.001
      });

      expect(result.current.vadSensitivity).toBe(0.001);
    });
  });

  describe('UI State Management', () => {
    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      expect(result.current.isSidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.isSidebarOpen).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.isSidebarOpen).toBe(true);
    });

    it('should toggle voice sheet', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      expect(result.current.isVoiceSheetOpen).toBe(false);

      act(() => {
        result.current.toggleVoiceSheet();
      });

      expect(result.current.isVoiceSheetOpen).toBe(true);
    });

    it('should select a message', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;
      let messageId: string;

      act(() => {
        threadId = result.current.createThread('Test', 'agent-1');
        messageId = result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Test',
        });
      });

      act(() => {
        result.current.setSelectedMessage(messageId!);
      });

      expect(result.current.selectedMessageId).toBe(messageId!);

      act(() => {
        result.current.setSelectedMessage(null);
      });

      expect(result.current.selectedMessageId).toBeNull();
    });
  });

  describe('Draft Message Management', () => {
    it('should save and retrieve draft messages per thread', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId1: string;
      let threadId2: string;

      act(() => {
        threadId1 = result.current.createThread('Thread 1', 'agent-1');
        threadId2 = result.current.createThread('Thread 2', 'agent-1');
      });

      act(() => {
        result.current.setDraftMessage(threadId1!, 'Draft for thread 1');
        result.current.setDraftMessage(threadId2!, 'Draft for thread 2');
      });

      expect(result.current.draftMessage[threadId1!]).toBe('Draft for thread 1');
      expect(result.current.draftMessage[threadId2!]).toBe('Draft for thread 2');
    });

    it('should clear draft messages', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;

      act(() => {
        threadId = result.current.createThread('Test', 'agent-1');
        result.current.setDraftMessage(threadId!, 'Draft text');
      });

      expect(result.current.draftMessage[threadId!]).toBe('Draft text');

      act(() => {
        result.current.clearDraftMessage(threadId!);
      });

      expect(result.current.draftMessage[threadId!]).toBeUndefined();
    });
  });

  describe('Selector Hooks', () => {
    it('useActiveThread should return the active thread', () => {
      const storeHook = renderHook(() => useUnifiedChatStore());
      const selectorHook = renderHook(() => useActiveThread());

      let threadId: string;

      act(() => {
        threadId = storeHook.result.current.createThread('Active Thread', 'agent-1');
        storeHook.result.current.setActiveThread(threadId!);
      });

      selectorHook.rerender();

      expect(selectorHook.result.current?.id).toBe(threadId!);
      expect(selectorHook.result.current?.title).toBe('Active Thread');
    });

    it('useThreadMessages should return messages for a specific thread', () => {
      const storeHook = renderHook(() => useUnifiedChatStore());

      let threadId: string;

      act(() => {
        threadId = storeHook.result.current.createThread('Test', 'agent-1');
        storeHook.result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Message 1',
        });
        storeHook.result.current.addMessage({
          threadId: threadId!,
          role: 'assistant',
          content: 'Message 2',
        });
      });

      const messagesHook = renderHook(() => useThreadMessages(threadId!));

      expect(messagesHook.result.current).toHaveLength(2);
      expect(messagesHook.result.current![0]!.content).toBe('Message 1');
      expect(messagesHook.result.current![1]!.content).toBe('Message 2');
    });

    it('useVoiceState should return voice state', () => {
      const storeHook = renderHook(() => useUnifiedChatStore());
      const voiceHook = renderHook(() => useVoiceState());

      act(() => {
        storeHook.result.current.setVoiceMode('listening');
        storeHook.result.current.setVoiceConnected(true);
        storeHook.result.current.setVoiceTranscript('Hello');
      });

      voiceHook.rerender();

      expect(voiceHook.result.current.mode).toBe('listening');
      expect(voiceHook.result.current.connected).toBe(true);
      expect(voiceHook.result.current.transcript).toBe('Hello');
    });
  });

  describe('Persistence', () => {
    it('should persist threads, messages, and settings', () => {
      const { result } = renderHook(() => useUnifiedChatStore());

      let threadId: string;

      act(() => {
        threadId = result.current.createThread('Persistent Thread', 'agent-1');
        result.current.addMessage({
          threadId: threadId!,
          role: 'user',
          content: 'Persistent message',
        });
        result.current.setVoiceId('voice-123');
        result.current.setAutoStartVoice(true);
      });

      // The actual persistence test would require mocking localStorage
      // Here we just verify the state is correct before persistence
      expect(result.current.threads[0]!.title).toBe('Persistent Thread');
      expect(result.current.messages[threadId!]![0]!.content).toBe('Persistent message');
      expect(result.current.voiceId).toBe('voice-123');
      expect(result.current.autoStartVoice).toBe(true);
    });
  });
});
