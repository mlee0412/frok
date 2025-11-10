'use client';

import { useState } from 'react';
import { Card } from '@frok/ui';

/**
 * Agent Tracing Dashboard
 *
 * Provides visualization of agent execution flows, tool usage, and performance metrics.
 * This is a minimal implementation - future enhancements can add:
 * - Real-time trace streaming
 * - Supabase storage for trace history
 * - Timeline visualization
 * - Cost analytics
 */

type TraceEvent = {
  id: string;
  type: 'agent_start' | 'agent_end' | 'tool_call' | 'handoff';
  agentName: string;
  timestamp: string;
  duration?: number;
  data?: Record<string, unknown>;
};

export default function TracesPage() {
  const [traces] = useState<TraceEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🔍 Agent Tracing Dashboard</h1>
        <p className="text-foreground/70">
          Monitor agent execution flows, tool usage, and performance metrics
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-surface border border-border rounded-lg text-sm"
        >
          <option value="all">All Events</option>
          <option value="agent_start">Agent Starts</option>
          <option value="tool_call">Tool Calls</option>
          <option value="handoff">Handoffs</option>
        </select>
      </div>

      {/* Empty State */}
      {traces.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-medium mb-2">No Traces Yet</h3>
          <p className="text-foreground/60 mb-6">
            Agent execution traces will appear here when you interact with FROK agents.
          </p>
          <div className="text-sm text-foreground/50 bg-surface p-4 rounded-lg inline-block">
            <div className="font-medium mb-2">How to Enable Tracing:</div>
            <ol className="text-left space-y-1">
              <li>1. AgentHooks are now enabled automatically</li>
              <li>2. Execute agent queries to generate traces</li>
              <li>3. Traces will appear in console logs (dev mode)</li>
              <li>4. Future: Traces stored in Supabase for visualization</li>
            </ol>
          </div>
        </Card>
      )}

      {/* Trace List */}
      {traces.length > 0 && (
        <div className="space-y-3">
          {traces
            .filter((t) => filter === 'all' || t.type === filter)
            .map((trace) => (
              <Card key={trace.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {trace.type === 'agent_start' && '🚀'}
                        {trace.type === 'agent_end' && '✅'}
                        {trace.type === 'tool_call' && '🔧'}
                        {trace.type === 'handoff' && '🔄'}
                      </span>
                      <div>
                        <div className="font-medium">{trace.agentName}</div>
                        <div className="text-sm text-foreground/60">{trace.type.replace('_', ' ')}</div>
                      </div>
                    </div>
                    {trace.data && (
                      <pre className="text-xs bg-surface p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(trace.data, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="text-right text-sm space-y-1">
                    <div className="text-foreground/60">{trace.timestamp}</div>
                    {trace.duration && (
                      <div className="text-primary font-medium">{trace.duration}ms</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Implementation Note */}
      <div className="mt-8 p-4 bg-info/10 border border-info/30 rounded-lg text-sm">
        <div className="font-medium mb-2">📝 Implementation Status</div>
        <ul className="space-y-1 text-foreground/80">
          <li>✅ AgentHooks implemented with lifecycle tracking</li>
          <li>✅ Console logging enabled (check browser/terminal logs)</li>
          <li>⏳ Supabase storage for trace history (coming soon)</li>
          <li>⏳ Real-time trace streaming (coming soon)</li>
          <li>⏳ Timeline visualization (coming soon)</li>
          <li>⏳ Cost analytics dashboard (coming soon)</li>
        </ul>
      </div>
    </div>
  );
}
