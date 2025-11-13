import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput, type ChatInputProps } from '../ChatInput';
import { useUnifiedChatStore } from '@/store/unifiedChatStore';
import * as fileUploadModule from '@/lib/storage/fileUpload';

// Mock modules
vi.mock('@/lib/i18n/I18nProvider', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  })),
}));

vi.mock('@/lib/storage/fileUpload', async () => {
  const actual = await vi.importActual<typeof fileUploadModule>('@/lib/storage/fileUpload');
  return {
    ...actual,
    uploadFiles: vi.fn().mockResolvedValue([
      { success: true, url: 'https://example.com/file1.jpg' },
    ]),
  };
});

describe('ChatInput', () => {
  const defaultProps: ChatInputProps = {
    threadId: 'test-thread-id',
    onSendMessage: vi.fn().mockResolvedValue(undefined),
    placeholder: 'Type a message...',
  };

  beforeEach(() => {
    // Reset store before each test
    useUnifiedChatStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render textarea with placeholder', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      expect(textarea).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<ChatInput {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('should render voice button when onVoiceToggle provided', () => {
      const onVoiceToggle = vi.fn();
      render(<ChatInput {...defaultProps} onVoiceToggle={onVoiceToggle} />);

      const voiceButton = screen.getByRole('button', { name: /voice/i });
      expect(voiceButton).toBeInTheDocument();
    });

    it('should not render voice button when onVoiceToggle not provided', () => {
      render(<ChatInput {...defaultProps} />);

      const voiceButton = screen.queryByRole('button', { name: /voice/i });
      expect(voiceButton).not.toBeInTheDocument();
    });

    it('should render file upload button', () => {
      render(<ChatInput {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /attach/i });
      expect(uploadButton).toBeInTheDocument();
    });

    it('should render character count when showCharCount is true', () => {
      const { container } = render(<ChatInput {...defaultProps} showCharCount maxLength={100} />);

      const charCountDiv = container.querySelector('.absolute.bottom-1.right-2');
      expect(charCountDiv).toBeInTheDocument();
      expect(charCountDiv).toHaveTextContent('0/100');
    });

    it('should not render character count when showCharCount is false', () => {
      render(<ChatInput {...defaultProps} showCharCount={false} maxLength={100} />);

      // Character count div should not be present
      const charCountDiv = document.querySelector('.absolute.bottom-1.right-2');
      expect(charCountDiv).not.toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should update input value on typing', async () => {
      const user = userEvent.setup();
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello world');

      expect(textarea).toHaveValue('Hello world');
    });

    it('should enforce maxLength', async () => {
      const user = userEvent.setup();
      render(<ChatInput {...defaultProps} maxLength={10} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'This is a very long message');

      expect(textarea).toHaveValue('This is a ');
    });

    it('should update character count on typing', async () => {
      const user = userEvent.setup();
      const { container } = render(<ChatInput {...defaultProps} showCharCount maxLength={100} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      const charCountDiv = container.querySelector('.absolute.bottom-1.right-2');
      expect(charCountDiv).toHaveTextContent('5/100');
    });

    it('should clear input on Escape key', async () => {
      const user = userEvent.setup();
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello world');
      expect(textarea).toHaveValue('Hello world');

      await user.type(textarea, '{Escape}');
      expect(textarea).toHaveValue('');
    });
  });

  describe('Draft Persistence', () => {
    it('should save draft to store after typing', async () => {
      const user = userEvent.setup();
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Draft message');

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          const draft = useUnifiedChatStore.getState().draftMessage[defaultProps.threadId];
          expect(draft).toBe('Draft message');
        },
        { timeout: 500 }
      );
    });

    it('should load draft from store on mount', () => {
      // Set draft in store
      useUnifiedChatStore.getState().setDraftMessage(defaultProps.threadId, 'Existing draft');

      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      expect(textarea).toHaveValue('Existing draft');
    });

    it('should clear draft from store after sending', async () => {
      const user = userEvent.setup();
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Message to send');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        const draft = useUnifiedChatStore.getState().draftMessage[defaultProps.threadId];
        expect(draft).toBe('');
      });
    });
  });

  describe('Sending Messages', () => {
    it('should call onSendMessage with trimmed content', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue(undefined);
      render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, '  Hello world  ');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Hello world', undefined);
      });
    });

    it('should not send empty message', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue(undefined);
      render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('should not send when disabled', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue(undefined);
      render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} disabled />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('should not send when isLoading is true', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue(undefined);
      render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} isLoading />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('should clear input after successful send', async () => {
      const user = userEvent.setup();
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello world');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should send on Cmd+Enter', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue(undefined);
      render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Hello', undefined);
      });
    });

    it('should send on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue(undefined);
      render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Control>}{Enter}{/Control}');

      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Hello', undefined);
      });
    });
  });

  describe('Voice Toggle', () => {
    it('should call onVoiceToggle when voice button clicked', async () => {
      const user = userEvent.setup();
      const onVoiceToggle = vi.fn();
      render(<ChatInput {...defaultProps} onVoiceToggle={onVoiceToggle} />);

      const voiceButton = screen.getByRole('button', { name: /voice/i });
      await user.click(voiceButton);

      expect(onVoiceToggle).toHaveBeenCalledTimes(1);
    });

    it('should show active state when isVoiceActive is true', () => {
      render(
        <ChatInput {...defaultProps} onVoiceToggle={vi.fn()} isVoiceActive />
      );

      const voiceButton = screen.getByRole('button', { name: /stopVoice|voice/i });
      expect(voiceButton).toHaveClass('bg-primary');
      expect(voiceButton).toHaveClass('text-white');
    });

    it('should not show active state when isVoiceActive is false', () => {
      render(
        <ChatInput {...defaultProps} onVoiceToggle={vi.fn()} isVoiceActive={false} />
      );

      const voiceButton = screen.getByRole('button', { name: /startVoice|voice/i });
      expect(voiceButton).not.toHaveClass('bg-primary');
      expect(voiceButton).toHaveClass('text-foreground/70');
    });
  });

  describe('Loading States', () => {
    it('should disable send button when isLoading is true', () => {
      render(<ChatInput {...defaultProps} isLoading />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('should disable textarea when disabled prop is true', () => {
      render(<ChatInput {...defaultProps} disabled />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      expect(textarea).toBeDisabled();
    });

    it('should show loading indicator when sending', async () => {
      const user = userEvent.setup();
      // Mock slow send
      const onSendMessage = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
      render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Should show loading state
      expect(sendButton).toBeDisabled();
    });
  });
});
