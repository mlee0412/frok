'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@frok/ui';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { isImageUrl, getFileIcon } from '@/lib/storage/fileUpload';

type MessageContentProps = {
  content: string;
  role: 'user' | 'assistant';
  fileUrls?: string[] | null;
};

export const MessageContent = React.memo(function MessageContent({ content, role, fileUrls }: MessageContentProps) {
  const tCommon = useTranslations('common');
  const tMessages = useTranslations('chat.messages');
  const [copied, setCopied] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'user') {
    return (
      <div className="flex flex-col gap-2">
        {content && <div className="whitespace-pre-wrap">{content}</div>}
        {fileUrls && fileUrls.length > 0 && <FileAttachments fileUrls={fileUrls} onImageClick={setSelectedImage} />}
        <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const inline = !className?.startsWith('language-');
              return !inline ? (
                <div className="relative">
                  <pre className="bg-background p-3 rounded-lg overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              ) : (
                <code
                  className="bg-surface px-1.5 py-0.5 rounded text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            a({ href, children }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary/400 hover:text-primary/300 underline"
                >
                  {children}
                </a>
              );
            },
            ul({ children }) {
              return <ul className="list-disc list-inside space-y-1">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="list-decimal list-inside space-y-1">{children}</ol>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      <Button
        onClick={handleCopy}
        variant="ghost"
        size="sm"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100"
        title={tCommon('copy')}
      >
        {copied ? `✓ ${tMessages('copied')}` : `📋 ${tCommon('copy')}`}
      </Button>
    </div>
  );
});

// ============================================================================
// FileAttachments Component
// ============================================================================

interface FileAttachmentsProps {
  fileUrls: string[];
  onImageClick: (url: string) => void;
}

function FileAttachments({ fileUrls, onImageClick }: FileAttachmentsProps) {
  const images = fileUrls.filter(isImageUrl);
  const documents = fileUrls.filter((url) => !isImageUrl(url));

  return (
    <div className="flex flex-col gap-2">
      {/* Images Grid */}
      {images.length > 0 && (
        <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {images.map((url, index) => (
            <motion.button
              key={index}
              onClick={() => onImageClick(url)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-surface hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              <img
                src={url}
                alt="Attachment"
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition group-hover:bg-background/30 group-hover:opacity-100">
                <span className="text-2xl">🔍</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-1">
          {documents.map((url, index) => {
            const filename = url.split('/').pop() || 'document';
            const decodedFilename = decodeURIComponent(filename);
            const fileIcon = getFileIcon(decodedFilename);

            return (
              <motion.a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition hover:border-primary hover:bg-surface/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <span className="text-xl">{fileIcon}</span>
                <span className="flex-1 truncate text-foreground">{decodedFilename}</span>
                <span className="text-xs text-foreground/50">↓</span>
              </motion.a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ImageModal Component
// ============================================================================

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (imageUrl) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [imageUrl, onClose]);

  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              title="Close"
              aria-label="Close image"
            >
              ×
            </button>

            {/* Image */}
            <img
              src={imageUrl}
              alt="Full size"
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
