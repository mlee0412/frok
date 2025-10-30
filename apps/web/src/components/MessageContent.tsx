'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@frok/ui';

type MessageContentProps = {
  content: string;
  role: 'user' | 'assistant';
};

export const MessageContent = React.memo(function MessageContent({ content, role }: MessageContentProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'user') {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="relative group">
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }: any) {
              const inline = !className?.startsWith('language-');
              return !inline ? (
                <div className="relative">
                  <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              ) : (
                <code
                  className="bg-gray-700 px-1.5 py-0.5 rounded text-sm"
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
                  className="text-sky-400 hover:text-sky-300 underline"
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
        title="Copy message"
      >
        {copied ? '✓ Copied' : '📋 Copy'}
      </Button>
    </div>
  );
});
