'use client';

import * as React from 'react';
import { MessageContent } from '@/components/MessageContent';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type SharedThread = {
  title: string;
  messages: Message[];
  created_at: string;
};

export default function SharedThreadPage() {
  const params = useParams();
  const token = params['token'] as string;
  const [thread, setThread] = React.useState<SharedThread | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchSharedThread = async () => {
      try {
        const res = await fetch(`/api/shared/${token}`);
        const json = await res.json();

        if (!json.ok) {
          setError(json.error || 'Failed to load conversation');
          return;
        }

        setThread(json.thread);
      } catch (e) {
        setError('Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedThread();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full"></div>
          <p className="mt-4">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">⚠️ Not Found</h1>
          <p className="text-gray-400">{error || 'This shared conversation does not exist or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>🔗 Shared Conversation</span>
          </div>
          <h1 className="text-2xl font-bold">{thread.title}</h1>
          <p className="text-sm text-gray-500 mt-2">
            {new Date(thread.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-6">
          {thread.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-6 py-4 ${
                  msg.role === 'user'
                    ? 'bg-sky-500 text-black'
                    : 'bg-gray-800 text-white'
                }`}
              >
                <div className="text-xs opacity-75 mb-2">
                  {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                </div>
                <MessageContent content={msg.content} role={msg.role} />
                <div className="text-xs opacity-50 mt-2">
                  {new Date(msg.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>
            Powered by <span className="font-semibold">FROK Agent</span>
          </p>
          <p className="mt-2">
            This is a read-only shared conversation. Visit{' '}
            <Link href="/" className="text-sky-400 hover:text-sky-300">
              FROK Agent
            </Link>{' '}
            to create your own.
          </p>
        </div>
      </div>
    </div>
  );
}
