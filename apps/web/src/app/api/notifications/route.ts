/**
 * Notifications API Route
 *
 * Provides recent activity notifications for the dashboard.
 * Shows recent AI responses, thread creations, and system events.
 *
 * GET /api/notifications
 * - Returns last 5 notifications from the past 24 hours
 * - Includes message content (truncated), timestamps, and links
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit } from '@/lib/api/withRateLimit';

export async function GET(req: NextRequest) {
  // Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Rate limiting (standard: 60 req/min)
  const rateLimit = await withRateLimit(req, {
    maxRequests: 60,
    windowMs: 60000,
  });
  if (!rateLimit.ok) return rateLimit.response;

  try {
    // Get messages from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent assistant messages
    const { data: recentMessages, error: messagesError } = await auth.user.supabase
      .from('chat_messages')
      .select('id, content, created_at, thread_id, role')
      .eq('user_id', auth.user.userId)
      .eq('role', 'assistant')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(3);

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    // Fetch recent threads (thread creation events)
    const { data: recentThreads, error: threadsError } = await auth.user.supabase
      .from('chat_threads')
      .select('id, title, created_at')
      .eq('user_id', auth.user.userId)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(2);

    if (threadsError) {
      throw new Error(`Failed to fetch threads: ${threadsError.message}`);
    }

    // Combine and format notifications
    const notifications: Array<{
      id: string;
      type: 'message' | 'thread_created';
      title: string;
      description: string;
      timestamp: string;
      link: string;
    }> = [];

    // Add message notifications
    if (recentMessages && recentMessages.length > 0) {
      for (const msg of recentMessages) {
        const content = msg.content as string;
        notifications.push({
          id: msg.id as string,
          type: 'message',
          title: '🤖 AI Response',
          description: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
          timestamp: msg.created_at as string,
          link: `/agent?thread=${msg.thread_id as string}`,
        });
      }
    }

    // Add thread creation notifications
    if (recentThreads && recentThreads.length > 0) {
      for (const thread of recentThreads) {
        const title = thread.title as string;
        notifications.push({
          id: `thread_${thread.id as string}`,
          type: 'thread_created',
          title: '💬 New Chat Created',
          description: title || 'Untitled',
          timestamp: thread.created_at as string,
          link: `/agent?thread=${thread.id as string}`,
        });
      }
    }

    // Sort by timestamp (most recent first)
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit to 5 most recent
    const limitedNotifications = notifications.slice(0, 5);

    return NextResponse.json(
      {
        ok: true,
        notifications: limitedNotifications,
        count: limitedNotifications.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
