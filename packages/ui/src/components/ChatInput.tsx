'use client';
import * as React from 'react';
import { Button } from './Button';

export type ChatInputProps = {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onTyping?: (typing: boolean) => void;
  className?: string;
};

export function ChatInput({ onSend, placeholder = 'Type a message…', disabled, onTyping, className }: ChatInputProps) {
  const [value, setValue] = React.useState('');
  const typingTimer = React.useRef<any>(null);
  function submit() {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue('');
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }
  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.currentTarget.value;
    setValue(v);
    if (onTyping) {
      try { onTyping(true); } catch {}
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => { try { onTyping(false); } catch {} }, 1200);
    }
  }
  return (
    <div className={[
      'w-full flex items-end gap-2 rounded-xl border border-border bg-surface p-2',
      className,
    ].filter(Boolean).join(' ')}>
      <textarea
        rows={1}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent outline-none text-sm text-foreground placeholder:text-foreground/50"
        disabled={disabled}
      />
      <Button size="sm" onClick={submit} disabled={disabled || !value.trim()}>Send</Button>
    </div>
  );
}
