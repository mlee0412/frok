'use client';

/**
 * NotificationsCard Component
 *
 * Displays recent activity notifications in the dashboard.
 * Shows AI responses, thread creations, and other events from the last 24 hours.
 *
 * Features:
 * - Auto-refresh every 30 seconds
 * - Links to relevant threads
 * - Relative timestamps
 * - Loading and empty states
 */

import React from 'react';
import { Card } from '@frok/ui';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';

type Notification = {
  id: string;
  type: 'message' | 'thread_created';
  title: string;
  description: string;
  timestamp: string;
  link: string;
};

type NotificationsResponse = {
  ok: boolean;
  notifications?: Notification[];
  count?: number;
  error?: string;
};

export function NotificationsCard() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data: NotificationsResponse = await res.json();

      if (data.ok && data.notifications) {
        setNotifications(data.notifications);
        setError(null);
      } else {
        setError(data.error || 'Failed to load notifications');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-foreground">🔔 Recent Activity</div>
        <button
          onClick={fetchNotifications}
          className="text-xs text-foreground/60 hover:text-foreground transition-colors"
          aria-label="Refresh notifications"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-surface-lighter rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-surface-lighter rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-sm text-danger">
          <div className="font-medium">Failed to load notifications</div>
          <div className="text-xs mt-1">{error}</div>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="text-sm text-foreground/60 text-center py-4">
          No recent activity in the last 24 hours
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              href={notif.link}
              className="block p-2 hover:bg-surface-lighter rounded transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {notif.title}
                  </div>
                  <div className="text-xs text-foreground/70 truncate mt-0.5">
                    {notif.description}
                  </div>
                </div>
                <div className="text-xs text-foreground/50 whitespace-nowrap">
                  {formatRelativeTime(new Date(notif.timestamp))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
