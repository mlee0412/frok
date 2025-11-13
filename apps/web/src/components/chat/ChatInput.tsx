'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { useUnifiedChatStore } from '@/store/unifiedChatStore';
import {
  uploadFiles,
  validateFile,
  formatFileSize,
  isImageFile,
  getFileIcon,
  type UploadProgress,
} from '@/lib/storage/fileUpload';
import { supabaseClient } from '@/lib/supabaseClient';

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
  onSendMessage: (content: string, fileUrls?: string[]) => Promise<void>;
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
  const [fileJustAdded, setFileJustAdded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    setUploadError(null);

    try {
      let fileUrls: string[] | undefined;

      // Upload files if present
      if (files.length > 0) {
        const client = supabaseClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Upload files with progress tracking
        const results = await uploadFiles(files, user.id, threadId, (progress) => {
          setUploadProgress(progress);
        });

        // Check for upload errors
        const failedUploads = results.filter((r) => !r.success);
        if (failedUploads.length > 0) {
          const errorMsg = failedUploads[0]?.error || 'File upload failed';
          setUploadError(errorMsg);
          setIsSending(false);
          return;
        }

        // Extract URLs from successful uploads
        fileUrls = results.filter((r) => r.success && r.url).map((r) => r.url!);
      }

      // Send message with file URLs
      await onSendMessage(trimmed, fileUrls);

      // Clear input and files on success
      setInput('');
      setFiles([]);
      setUploadProgress([]);
      setDraftMessage(threadId, '');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to send message');
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

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleAddFiles(selectedFiles);
  };

  const handleAddFiles = (newFiles: File[]) => {
    setUploadError(null);

    // Limit to 5 files
    const remaining = 5 - files.length;
    if (remaining <= 0) {
      setUploadError('Maximum 5 files allowed per message');
      return;
    }

    const filesToAdd = newFiles.slice(0, remaining);

    // Validate each file
    for (const file of filesToAdd) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        return;
      }
    }

    setFiles((prev) => [...prev, ...filesToAdd]);

    // Trigger bounce animation
    if (filesToAdd.length > 0) {
      setFileJustAdded(true);
      setTimeout(() => setFileJustAdded(false), 600);
    }
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
      {/* Error Message */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            ⚠️ {uploadError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Previews */}
      <AnimatePresence mode="popLayout">
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {files.map((file, index) => {
              const progress = uploadProgress.find((p) => p.file === file);
              return (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  progress={progress}
                  onRemove={() => handleRemoveFile(index)}
                />
              );
            })}
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
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending || isLoading || files.length >= 5}
            animate={
              fileJustAdded
                ? {
                    y: [0, -10, 0, -5, 0],
                    scale: [1, 1.1, 1, 1.05, 1],
                  }
                : {}
            }
            transition={{ duration: 0.6 }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition hover:bg-surface hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            title={t('attachFile')}
            aria-label={t('attachFile')}
          >
            📎
          </motion.button>

          {/* Voice Toggle Button */}
          {onVoiceToggle && (
            <motion.button
              type="button"
              onClick={onVoiceToggle}
              disabled={disabled || isSending || isLoading}
              animate={
                isVoiceActive
                  ? {
                      scale: [1, 1.1, 1],
                    }
                  : {}
              }
              transition={{
                duration: 1,
                repeat: isVoiceActive ? Infinity : 0,
                ease: 'easeInOut',
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary ${
                isVoiceActive
                  ? 'bg-primary text-white'
                  : 'text-foreground/70 hover:bg-surface hover:text-foreground'
              }`}
              title={isVoiceActive ? t('stopVoice') : t('startVoice')}
              aria-label={isVoiceActive ? t('stopVoice') : t('startVoice')}
            >
              {isVoiceActive ? '⏸️' : '🎤'}
            </motion.button>
          )}

          {/* Send Button */}
          <motion.button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            whileTap={{ scale: 0.9, rotate: 360 }}
            transition={{ duration: 0.3 }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            title={t('send')}
            aria-label={t('send')}
          >
            {isSending || isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              '➤'
            )}
          </motion.button>
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
  progress?: UploadProgress;
  onRemove: () => void;
}

function FilePreview({ file, progress, onRemove }: FilePreviewProps) {
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

  const isImage = isImageFile(file);
  const fileSize = formatFileSize(file.size);
  const fileIcon = getFileIcon(file.name);
  const isUploading = progress && progress.status === 'uploading';
  const uploadPercent = progress?.progress || 0;

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
            loading="lazy"
            className="h-full w-full object-cover"
          />

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-xs font-medium text-primary">{uploadPercent}%</div>
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface/50">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${uploadPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Remove Button */}
          {!isUploading && (
            <button
              onClick={onRemove}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-surface"
              title="Remove"
              aria-label="Remove file"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface p-2">
          <span className="text-2xl">{fileIcon}</span>
          <span className="truncate w-full text-center text-xs text-foreground/70">{file.name}</span>

          {isUploading ? (
            <span className="text-xs font-medium text-primary">{uploadPercent}%</span>
          ) : (
            <span className="text-xs text-foreground/50">{fileSize}</span>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface/50 rounded-b-lg overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${uploadPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Remove Button */}
          {!isUploading && (
            <button
              onClick={onRemove}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-surface"
              title="Remove"
              aria-label="Remove file"
            >
              ×
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
