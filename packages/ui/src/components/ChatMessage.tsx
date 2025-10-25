import * as React from 'react';

export type ChatMessageProps = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  className?: string;
};

export function ChatMessage({ role, content, className }: ChatMessageProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  return (
    <div
      className={[
        'w-full flex',
        isUser ? 'justify-end' : 'justify-start',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div
        className={[
          'max-w-[75ch] rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap',
          isUser ? 'bg-surface border-border text-foreground' : 'bg-surface border-border text-foreground',
        ].join(' ')}
      >
        {content || (isAssistant ? '…' : '')}
      </div>
    </div>
  );
}
