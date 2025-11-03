'use client';

/**
 * Profile Page
 *
 * Displays user profile information and recent activity.
 * Shows email, account creation date, and usage statistics.
 */

import React from 'react';
import { Card, Button } from '@frok/ui';
import { useAuth } from '@/lib/useAuth';
import { formatRelativeTime } from '@/lib/utils';

type UserStats = {
  totalThreads: number;
  totalMessages: number;
  lastActive: string;
};

type RecentActivity = {
  id: string;
  action: string;
  timestamp: string;
  details: string;
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = React.useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = React.useState<RecentActivity[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const fetchProfileData = async () => {
      try {
        // Fetch user statistics
        const [threadsRes, messagesRes] = await Promise.all([
          fetch('/api/chat/threads'),
          fetch('/api/chat/messages?limit=1'),
        ]);

        const threadsData = await threadsRes.json();
        const messagesData = await messagesRes.json();

        if (threadsData.ok && messagesData.ok) {
          setStats({
            totalThreads: threadsData.threads?.length || 0,
            totalMessages: messagesData.total || 0,
            lastActive: messagesData.messages?.[0]?.created_at || new Date().toISOString(),
          });

          // Create recent activity from threads
          const activity: RecentActivity[] = [];
          if (threadsData.threads && threadsData.threads.length > 0) {
            const recentThreads = threadsData.threads.slice(0, 5);
            for (const thread of recentThreads) {
              activity.push({
                id: thread.id,
                action: '💬 Chat Created',
                timestamp: thread.created_at,
                details: thread.title || 'Untitled',
              });
            }
          }
          setRecentActivity(activity);
        }
      } catch (error: unknown) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-foreground/60">
          Please sign in to view your profile
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <Button onClick={signOut} variant="outline">
          Sign Out
        </Button>
      </div>

      {/* User Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="text-primary font-semibold mb-4">👤 Account Information</div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-foreground/60">Email</div>
              <div className="text-foreground font-medium">{user.email}</div>
            </div>
            <div>
              <div className="text-foreground/60">User ID</div>
              <div className="text-foreground font-mono text-xs truncate">
                {user.id}
              </div>
            </div>
            {user.created_at && (
              <div>
                <div className="text-foreground/60">Member Since</div>
                <div className="text-foreground">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Usage Statistics */}
        <Card className="p-6">
          <div className="text-primary font-semibold mb-4">📊 Usage Statistics</div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-surface-lighter rounded animate-pulse"></div>
              <div className="h-4 bg-surface-lighter rounded animate-pulse"></div>
              <div className="h-4 bg-surface-lighter rounded animate-pulse"></div>
            </div>
          ) : stats ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-foreground/60">Total Conversations</div>
                <div className="text-foreground font-semibold text-2xl">
                  {stats.totalThreads}
                </div>
              </div>
              <div>
                <div className="text-foreground/60">Total Messages</div>
                <div className="text-foreground font-semibold text-2xl">
                  {stats.totalMessages}
                </div>
              </div>
              <div>
                <div className="text-foreground/60">Last Active</div>
                <div className="text-foreground">
                  {formatRelativeTime(new Date(stats.lastActive))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-foreground/60 text-sm">No usage data available</div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="text-primary font-semibold mb-4">📅 Recent Activity</div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 bg-surface-lighter rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-surface-lighter rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-surface-lighter rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-surface-lighter/50 rounded hover:bg-surface-lighter transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>{activity.action}</div>
                  <div className="text-foreground/70 text-sm truncate max-w-md">
                    {activity.details}
                  </div>
                </div>
                <div className="text-foreground/50 text-xs whitespace-nowrap ml-4">
                  {formatRelativeTime(new Date(activity.timestamp))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-foreground/60 text-sm text-center py-4">
            No recent activity
          </div>
        )}
      </Card>
    </div>
  );
}
