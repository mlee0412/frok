'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { useUnifiedChatStore } from '@/store/unifiedChatStore';

// ============================================================================
// ChatInput Component
// ============================================================================

/**
 * ChatInput - Message input with voice toggle and file upload
 *
 * Features:
 * - Auto-resize textarea (1-10 lines)
 * - Draft persistence (auto-saves to store)
 * - Voice toggle button with visual feedback
 * - File upload with drag-and-drop support
 * - File preview with remove capability
 * - Send button with loading states
 * - Keyboard shortcuts:
 *   - Enter: New line (or send if Shift+Enter disabled)
 *   - Cmd/Ctrl+Enter: Send message
 *   - Escape: Clear input
 * - Character count (optional)
 * - Disabled state when sending/loading
 */

export interface ChatInputProps {
  threadId: string;
  onSendMessage: (content: string, files?: File[]) => Promise<void>;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
  disabled?: boolean;
}

export const ChatInput = memo(function ChatInput({
  threadId,
  onSendMessage,
  onVoiceToggle,
  isVoiceActive = false,
  isLoading = false,
  placeholder,
  maxLength = 4000,
  showCharCount = false,
  disabled = false,
}: ChatInputProps) {
  const t = useTranslations('chat.input');

  // Store state
  const draftMessage = useUnifiedChatStore((state) => state.draftMessage[threadId] || '');
  const setDraftMessage = useUnifiedChatStore((state) => state.setDraftMessage);

  // Local state
  const [input, setInput] = useState(draftMessage);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight = 240; // ~10 lines at 24px line-height
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Update input when draft changes (e.g., from different thread)
  useEffect(() => {
    setInput(draftMessage);
  }, [draftMessage, threadId]);

  // Auto-resize on input change
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Persist draft to store (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDraftMessage(threadId, input);
    }, 300);

    return () => clearTimeout(timeout);
  }, [input, threadId, setDraftMessage]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setInput(value);
    }
  };

  // Handle send
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed && files.length === 0) return;
    if (isSending || isLoading || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(trimmed, files.length > 0 ? files : undefined);

      // Clear input and files on success
      setInput('');
      setFiles([]);
      setDraftMessage(threadId, '');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error toast
    } finally {
      setIsSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter: Send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
      return;
    }

    // Escape: Clear input
    if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setFiles([]);
      setDraftMessage(threadId, '');
      return;
    }

    // Enter: Send (if no files and short message)
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      // Only send on Enter if message is short (< 50 chars)
      if (input.trim().length > 0 && input.trim().length < 50 && files.length === 0) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleAddFiles(selectedFiles);
  };

  const handleAddFiles = (newFiles: File[]) => {
    // Limit to 5 files
    const remaining = 5 - files.length;
    const filesToAdd = newFiles.slice(0, remaining);
    setFiles((prev) => [...prev, ...filesToAdd]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleAddFiles(droppedFiles);
  };

  const canSend = (input.trim().length > 0 || files.length > 0) && !isSending && !isLoading && !disabled;

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-surface/60 p-4 backdrop-blur-sm">
      {/* File Previews */}
      <AnimatePresence mode="popLayout">
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {files.map((file, index) => (
              <FilePreview
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => handleRemoveFile(index)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div
        className={`relative flex items-end gap-2 rounded-xl border transition-colors ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-background'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
            <div className="text-center">
              <div className="mb-2 text-4xl">📁</div>
              <div className="text-sm font-medium text-primary">{t('dropFiles')}</div>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('placeholder')}
            disabled={disabled || isSending || isLoading}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '240px' }}
          />

          {/* Character Count */}
          {showCharCount && (
            <div className="absolute bottom-1 right-2 text-xs text-foreground/40">
              {input.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-end gap-1 pb-2 pr-2">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending || isLoading || files.length >= 5}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title={t('attachFile')}
          >
            📎
          </button>

          {/* Voice Toggle Button */}
          {onVoiceToggle && (
            <button
              type="button"
              onClick={onVoiceToggle}
              disabled={disabled || isSending || isLoading}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                isVoiceActive
                  ? 'bg-primary text-white'
                  : 'text-foreground/70 hover:bg-surface hover:text-foreground'
              }`}
              title={isVoiceActive ? t('stopVoice') : t('startVoice')}
            >
              {isVoiceActive ? '⏸️' : '🎤'}
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            title={t('send')}
          >
            {isSending || isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              '➤'
            )}
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Hint Text */}
      <div className="flex items-center justify-between px-1 text-xs text-foreground/50">
        <span>
          {t('hint')}
        </span>
        {files.length > 0 && (
          <span>
            {files.length}/5 {t('filesSelected')}
          </span>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// FilePreview Component
// ============================================================================

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  const isImage = file.type.startsWith('image/');
  const fileSize = formatFileSize(file.size);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative"
    >
      {isImage && preview ? (
        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-surface">
          <img
            src={preview}
            alt={file.name}
            className="h-full w-full object-cover"
          />
          <button
            onClick={onRemove}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-0 transition group-hover:opacity-100"
            title="Remove"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface p-2">
          <span className="text-2xl">📄</span>
          <span className="truncate text-xs text-foreground/70">{file.name}</span>
          <span className="text-xs text-foreground/50">{fileSize}</span>
          <button
            onClick={onRemove}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-0 transition group-hover:opacity-100"
            title="Remove"
          >
            ×
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
