import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageCard, type MessageCardProps } from '../MessageCard';
import type { Message } from '@/store/unifiedChatStore';

// Mock modules
vi.mock('@/lib/i18n/I18nProvider', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/hooks/useGestures', () => ({
  useGestures: () => ({ current: null }),
}));

vi.mock('@/hooks/useHaptic', () => ({
  useHaptic: () => ({
    vibrate: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    ttsState: 'idle',
    currentMessageId: null,
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('@/components/MessageContent', () => ({
  MessageContent: ({ content, fileUrls }: { content: string; fileUrls?: string[] }) => (
    <div data-testid="message-content">
      <div>{content}</div>
      {fileUrls && fileUrls.length > 0 && (
        <div data-testid="file-attachments">
          {fileUrls.map((url, i) => (
            <div key={i} data-testid={`file-${i}`}>
              {url}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 minutes ago',
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, className, ...props }: any) => (
      <button className={className} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('MessageCard', () => {
  const baseMessage: Message = {
    id: 'msg-1',
    threadId: 'thread-1',
    role: 'user',
    content: 'Hello world',
    timestamp: Date.now(),
  };

  const defaultProps: MessageCardProps = {
    message: baseMessage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render user message with correct styling', () => {
      render(<MessageCard {...defaultProps} />);

      expect(screen.getByText('👤')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    });

    it('should render assistant message with correct styling', () => {
      const assistantMessage: Message = {
        ...baseMessage,
        id: 'msg-2',
        role: 'assistant',
        content: 'How can I help?',
      };

      render(<MessageCard message={assistantMessage} />);

      expect(screen.getByText('🤖')).toBeInTheDocument();
      expect(screen.getByText('assistant')).toBeInTheDocument();
      expect(screen.getByText('How can I help?')).toBeInTheDocument();
    });

    it('should render system message with correct styling', () => {
      const systemMessage: Message = {
        ...baseMessage,
        id: 'msg-3',
        role: 'system',
        content: 'System notification',
      };

      render(<MessageCard message={systemMessage} />);

      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('system')).toBeInTheDocument();
      expect(screen.getByText('System notification')).toBeInTheDocument();
    });

    it('should show voice indicator for voice messages', () => {
      const voiceMessage: Message = {
        ...baseMessage,
        source: 'voice',
      };

      render(<MessageCard message={voiceMessage} />);

      expect(screen.getByText('🎤 voice')).toBeInTheDocument();
    });

    it('should not show voice indicator for text messages', () => {
      render(<MessageCard {...defaultProps} />);

      expect(screen.queryByText('🎤 voice')).not.toBeInTheDocument();
    });

    it('should render compact mode correctly', () => {
      const { container } = render(<MessageCard {...defaultProps} isCompact />);

      // Check for compact padding class
      const messageDiv = container.querySelector('.px-4.py-3');
      expect(messageDiv).toBeInTheDocument();
    });

    it('should render timestamp using formatDistanceToNow', () => {
      render(<MessageCard {...defaultProps} />);

      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    });
  });

  describe('File Attachments', () => {
    it('should render file attachments when present', () => {
      const messageWithFiles: Message = {
        ...baseMessage,
        fileUrls: ['https://example.com/file1.jpg', 'https://example.com/file2.pdf'],
      };

      render(<MessageCard message={messageWithFiles} />);

      expect(screen.getByTestId('file-attachments')).toBeInTheDocument();
      expect(screen.getByTestId('file-0')).toHaveTextContent('https://example.com/file1.jpg');
      expect(screen.getByTestId('file-1')).toHaveTextContent('https://example.com/file2.pdf');
    });

    it('should not render attachments section when no files', () => {
      render(<MessageCard {...defaultProps} />);

      expect(screen.queryByTestId('file-attachments')).not.toBeInTheDocument();
    });
  });

  describe('Tool Calls', () => {
    it('should show tool calls toggle when tool calls exist', () => {
      const messageWithTools: Message = {
        ...baseMessage,
        role: 'assistant',
        metadata: {
          toolCalls: [
            {
              id: 'tool-1',
              name: 'get_weather',
              arguments: '{"city": "San Francisco"}',
              status: 'success',
            },
          ],
        },
      };

      render(<MessageCard message={messageWithTools} />);

      expect(screen.getByText(/🔧 toolCalls \(1\)/)).toBeInTheDocument();
    });

    it('should expand tool calls when toggle clicked', async () => {
      const user = userEvent.setup();
      const messageWithTools: Message = {
        ...baseMessage,
        role: 'assistant',
        metadata: {
          toolCalls: [
            {
              id: 'tool-1',
              name: 'get_weather',
              arguments: '{"city": "San Francisco"}',
              status: 'success',
              result: '{"temperature": 72}',
            },
          ],
        },
      };

      render(<MessageCard message={messageWithTools} />);

      const toggleButton = screen.getByText(/🔧 toolCalls/);
      await user.click(toggleButton);

      expect(screen.getByText('get_weather')).toBeInTheDocument();
    });

    it('should not show tool calls section when none exist', () => {
      render(<MessageCard {...defaultProps} />);

      expect(screen.queryByText(/🔧 toolCalls/)).not.toBeInTheDocument();
    });

    it('should show correct count of tool calls', () => {
      const messageWithMultipleTools: Message = {
        ...baseMessage,
        role: 'assistant',
        metadata: {
          toolCalls: [
            { id: 'tool-1', name: 'tool1', arguments: '{}', status: 'success' },
            { id: 'tool-2', name: 'tool2', arguments: '{}', status: 'success' },
            { id: 'tool-3', name: 'tool3', arguments: '{}', status: 'success' },
          ],
        },
      };

      render(<MessageCard message={messageWithMultipleTools} />);

      expect(screen.getByText(/🔧 toolCalls \(3\)/)).toBeInTheDocument();
    });
  });

  describe('Thinking Process', () => {
    it('should show thinking process toggle when present', () => {
      const messageWithThinking: Message = {
        ...baseMessage,
        role: 'assistant',
        metadata: {
          thinkingProcess: 'Let me analyze this...',
        },
      };

      render(<MessageCard message={messageWithThinking} />);

      expect(screen.getByText('🧠 thinking')).toBeInTheDocument();
    });

    it('should expand thinking process when toggle clicked', async () => {
      const user = userEvent.setup();
      const messageWithThinking: Message = {
        ...baseMessage,
        role: 'assistant',
        metadata: {
          thinkingProcess: 'Analyzing the problem step by step...',
        },
      };

      render(<MessageCard message={messageWithThinking} />);

      const toggleButton = screen.getByText('🧠 thinking');
      await user.click(toggleButton);

      expect(screen.getByText('Analyzing the problem step by step...')).toBeInTheDocument();
    });

    it('should not show thinking process when not present', () => {
      render(<MessageCard {...defaultProps} />);

      expect(screen.queryByText('🧠 thinking')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show copy button when onCopy provided', () => {
      const onCopy = vi.fn();
      render(<MessageCard {...defaultProps} onCopy={onCopy} />);

      expect(screen.getByText('📋 copy')).toBeInTheDocument();
    });

    it('should call onCopy when copy button clicked', async () => {
      const user = userEvent.setup();
      const onCopy = vi.fn();
      render(<MessageCard {...defaultProps} onCopy={onCopy} />);

      const copyButton = screen.getByText('📋 copy');
      await user.click(copyButton);

      expect(onCopy).toHaveBeenCalledTimes(1);
    });

    it('should show regenerate button for assistant messages', () => {
      const assistantMessage: Message = {
        ...baseMessage,
        role: 'assistant',
      };
      const onRegenerate = vi.fn();

      render(<MessageCard message={assistantMessage} onRegenerate={onRegenerate} />);

      expect(screen.getByText('🔄 regenerate')).toBeInTheDocument();
    });

    it('should not show regenerate button for user messages', () => {
      const onRegenerate = vi.fn();
      render(<MessageCard {...defaultProps} onRegenerate={onRegenerate} />);

      expect(screen.queryByText('🔄 regenerate')).not.toBeInTheDocument();
    });

    it('should show edit button for user messages', () => {
      const onEdit = vi.fn();
      render(<MessageCard {...defaultProps} onEdit={onEdit} />);

      expect(screen.getByText('✏️ edit')).toBeInTheDocument();
    });

    it('should not show edit button for assistant messages', () => {
      const assistantMessage: Message = {
        ...baseMessage,
        role: 'assistant',
      };
      const onEdit = vi.fn();

      render(<MessageCard message={assistantMessage} onEdit={onEdit} />);

      expect(screen.queryByText('✏️ edit')).not.toBeInTheDocument();
    });

    it('should show delete button when onDelete provided', () => {
      const onDelete = vi.fn();
      render(<MessageCard {...defaultProps} onDelete={onDelete} />);

      expect(screen.getByText('🗑️ delete')).toBeInTheDocument();
    });

    it('should not show action buttons when showActions is false', () => {
      const onCopy = vi.fn();
      const onDelete = vi.fn();
      render(
        <MessageCard {...defaultProps} onCopy={onCopy} onDelete={onDelete} showActions={false} />
      );

      expect(screen.queryByText('📋 copy')).not.toBeInTheDocument();
      expect(screen.queryByText('🗑️ delete')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should render textarea in edit mode', () => {
      render(<MessageCard {...defaultProps} isEditing />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('Hello world');
    });

    it('should call onEdit with new content when save clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(<MessageCard {...defaultProps} isEditing onEdit={onEdit} />);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Updated message');

      const saveButton = screen.getByText('save');
      await user.click(saveButton);

      expect(onEdit).toHaveBeenCalledWith('Updated message');
    });

    it('should call onCancelEdit when cancel clicked', async () => {
      const user = userEvent.setup();
      const onCancelEdit = vi.fn();
      render(<MessageCard {...defaultProps} isEditing onCancelEdit={onCancelEdit} />);

      const cancelButton = screen.getByText('cancel');
      await user.click(cancelButton);

      expect(onCancelEdit).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace when saving edited content', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(<MessageCard {...defaultProps} isEditing onEdit={onEdit} />);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, '  Trimmed  ');

      const saveButton = screen.getByText('save');
      await user.click(saveButton);

      expect(onEdit).toHaveBeenCalledWith('Trimmed');
    });

    it('should not call onEdit if content is empty after trimming', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(<MessageCard {...defaultProps} isEditing onEdit={onEdit} />);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, '   ');

      const saveButton = screen.getByText('save');
      await user.click(saveButton);

      expect(onEdit).not.toHaveBeenCalled();
    });

    it('should hide action buttons in edit mode', () => {
      const onCopy = vi.fn();
      render(<MessageCard {...defaultProps} isEditing onCopy={onCopy} />);

      expect(screen.queryByText('📋 copy')).not.toBeInTheDocument();
    });
  });

  describe('TTS Integration', () => {
    it('should show speak button for assistant messages', () => {
      const assistantMessage: Message = {
        ...baseMessage,
        role: 'assistant',
      };

      render(<MessageCard message={assistantMessage} />);

      expect(screen.getByText('🔊 Speak')).toBeInTheDocument();
    });

    it('should not show speak button for user messages', () => {
      render(<MessageCard {...defaultProps} />);

      expect(screen.queryByText('🔊 Speak')).not.toBeInTheDocument();
    });

    it('should not show speak button for system messages', () => {
      const systemMessage: Message = {
        ...baseMessage,
        role: 'system',
      };

      render(<MessageCard message={systemMessage} />);

      expect(screen.queryByText('🔊 Speak')).not.toBeInTheDocument();
    });
  });

  describe('Role-based Styling', () => {
    it('should apply user styling classes', () => {
      const { container } = render(<MessageCard {...defaultProps} />);

      const messageDiv = container.querySelector('.bg-primary\\/10.border-primary\\/30');
      expect(messageDiv).toBeInTheDocument();
    });

    it('should apply assistant styling classes', () => {
      const assistantMessage: Message = {
        ...baseMessage,
        role: 'assistant',
      };
      const { container } = render(<MessageCard message={assistantMessage} />);

      const messageDiv = container.querySelector('.bg-surface.border-border');
      expect(messageDiv).toBeInTheDocument();
    });

    it('should apply system styling classes', () => {
      const systemMessage: Message = {
        ...baseMessage,
        role: 'system',
      };
      const { container } = render(<MessageCard message={systemMessage} />);

      const messageDiv = container.querySelector('.bg-warning\\/10.border-warning\\/30');
      expect(messageDiv).toBeInTheDocument();
    });

    it('should align user messages to the right', () => {
      const { container } = render(<MessageCard {...defaultProps} />);

      const flexContainer = container.querySelector('.justify-end');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should align assistant messages to the left', () => {
      const assistantMessage: Message = {
        ...baseMessage,
        role: 'assistant',
      };
      const { container } = render(<MessageCard message={assistantMessage} />);

      const flexContainer = container.querySelector('.justify-start');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should handle message without metadata', () => {
      expect(() => render(<MessageCard {...defaultProps} />)).not.toThrow();
    });

    it('should handle message without fileUrls', () => {
      expect(() => render(<MessageCard {...defaultProps} />)).not.toThrow();
    });

    it('should handle message without source', () => {
      expect(() => render(<MessageCard {...defaultProps} />)).not.toThrow();
    });

    it('should handle all optional props being undefined', () => {
      expect(() => render(<MessageCard message={baseMessage} />)).not.toThrow();
    });
  });
});
