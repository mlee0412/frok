'use client';

import React from 'react';
import { Card } from '@frok/ui';
import {
  getCostStatistics,
  formatCost,
} from '@/lib/costTracking';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tools?: string[];
  timestamp: number;
};

export default function AnalyticsPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<7 | 30 | 90>(7);

  // Fetch all messages for cost calculation
  React.useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        // Fetch recent threads
        const threadsRes = await fetch('/api/chat/threads');
        const threadsData = await threadsRes.json();

        if (!threadsData.ok || !threadsData.threads) {
          throw new Error('Failed to fetch threads');
        }

        // Fetch messages for all threads
        const allMessages: Message[] = [];
        for (const thread of threadsData.threads.slice(0, 50)) {
          // Limit to 50 threads for performance
          const messagesRes = await fetch(`/api/chat/messages?thread_id=${thread.id}`);
          const messagesData = await messagesRes.json();

          if (messagesData.ok && messagesData.messages) {
            allMessages.push(
              ...messagesData.messages.map((m: { id: string; role: string; content: string; created_at: string; }) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                model: 'gpt-5-mini', // Default model (would need to store this in DB)
                tools: [], // Default no tools (would need to store this in DB)
                timestamp: new Date(m.created_at).getTime(),
              }))
            );
          }
        }

        setMessages(allMessages);
      } catch (error) {
        console.error('Failed to fetch messages for analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (messages.length === 0) {
      return {
        totalCost: 0,
        averageCostPerMessage: 0,
        costByModel: {},
        costByDay: [],
        messageCount: 0,
      };
    }
    return getCostStatistics(messages, period);
  }, [messages, period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Analytics</h1>
          <div className="animate-pulse">
            <div className="h-32 bg-surface rounded-lg mb-4"></div>
            <div className="h-32 bg-surface rounded-lg mb-4"></div>
            <div className="h-64 bg-surface rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Cost Analytics</h1>
            <p className="text-foreground/60 text-sm mt-1">
              Track AI usage and estimated costs
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  period === days
                    ? 'bg-primary/500 text-white'
                    : 'bg-surface text-foreground/70 hover:bg-surface/80'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="text-foreground/60 text-sm mb-1">Total Cost</div>
            <div className="text-3xl font-bold text-white">
              {formatCost(stats.totalCost)}
            </div>
            <div className="text-xs text-foreground/60 mt-2">
              Last {period} days
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-foreground/60 text-sm mb-1">Messages</div>
            <div className="text-3xl font-bold text-white">
              {stats.messageCount.toLocaleString()}
            </div>
            <div className="text-xs text-foreground/60 mt-2">
              Assistant responses
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-foreground/60 text-sm mb-1">Avg Cost/Message</div>
            <div className="text-3xl font-bold text-white">
              {formatCost(stats.averageCostPerMessage)}
            </div>
            <div className="text-xs text-foreground/60 mt-2">
              Per response
            </div>
          </Card>
        </div>

        {/* Cost Breakdown by Model */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost by Model</h2>
          <div className="space-y-3">
            {Object.entries(stats.costByModel).length === 0 ? (
              <p className="text-foreground/60 text-sm">No data available</p>
            ) : (
              Object.entries(stats.costByModel)
                .sort(([, a], [, b]) => b - a)
                .map(([model, cost]) => (
                  <div key={model} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/500"></div>
                      <span className="text-foreground/70 font-mono text-sm">{model}</span>
                    </div>
                    <span className="text-white font-semibold">{formatCost(cost)}</span>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* Cost Timeline */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Daily Cost</h2>
          <div className="space-y-2">
            {stats.costByDay.length === 0 ? (
              <p className="text-foreground/60 text-sm">No data available</p>
            ) : (
              stats.costByDay.map(({ date, cost }) => (
                <div key={date} className="flex items-center gap-4">
                  <div className="text-foreground/60 text-sm font-mono w-28">
                    {new Date(date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="flex-1 bg-surface rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary/500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (cost / Math.max(...stats.costByDay.map((d) => d.cost))) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-white font-semibold w-20 text-right">
                    {formatCost(cost)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Cost Estimates */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Projected Monthly Cost</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground/60">Based on last {period} days</span>
              <span className="text-2xl font-bold text-white">
                {formatCost((stats.totalCost / period) * 30)}
              </span>
            </div>
            <div className="text-xs text-foreground/60">
              * This is an estimate based on current usage patterns
            </div>
          </div>
        </Card>

        {/* Cost Breakdown Table */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-foreground/60 font-medium">Metric</th>
                  <th className="text-right py-3 px-4 text-foreground/60 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-foreground/70">Total Messages Analyzed</td>
                  <td className="py-3 px-4 text-right text-white font-mono">
                    {messages.length.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-foreground/70">Assistant Responses</td>
                  <td className="py-3 px-4 text-right text-white font-mono">
                    {stats.messageCount.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-foreground/70">Period</td>
                  <td className="py-3 px-4 text-right text-white font-mono">
                    {period} days
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-foreground/70">Total Cost</td>
                  <td className="py-3 px-4 text-right text-white font-mono font-semibold">
                    {formatCost(stats.totalCost)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-foreground/70">Estimated Monthly</td>
                  <td className="py-3 px-4 text-right text-white font-mono font-semibold">
                    {formatCost((stats.totalCost / period) * 30)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
