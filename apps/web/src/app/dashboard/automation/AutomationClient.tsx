'use client';
import * as React from 'react';
import { Card, Button, useToast } from '@frok/ui';

// n8n types
type N8NWorkflow = {
  id?: string;
  _id?: string;
  name?: string;
  active?: boolean;
};

type N8NExecution = {
  id?: string;
  _id?: string;
  workflowId?: string;
  workflowData?: { name?: string };
  status?: string;
  finished?: boolean;
  startedAt?: string;
  mode?: string;
};

export default function AutomationClient() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [workflows, setWorkflows] = React.useState<N8NWorkflow[]>([]);
  const [executions, setExecutions] = React.useState<N8NExecution[]>([]);
  const [missingEnv, setMissingEnv] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [w, e] = await Promise.all([
        fetch('/api/n8n/workflows', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/n8n/executions', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);
      if (w && w.ok === false && w.error === 'missing_env') setMissingEnv(w.detail || 'Missing env');
      if (e && e.ok === false && e.error === 'missing_env') setMissingEnv(e.detail || 'Missing env');
      setWorkflows(Array.isArray(w?.workflows) ? w.workflows : []);
      setExecutions(Array.isArray(e?.executions) ? e.executions : []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function trigger(id: string) {
    setPendingId(id);
    try {
      const r = await fetch(`/api/n8n/workflows/${id}/trigger`, { method: 'POST' });
      const j = await r.json();
      if (j && j.ok) {
        toast.success('Workflow triggered');
        load();
      } else if (j && j.error === 'missing_env') {
        setMissingEnv(j.detail || 'Missing env');
        toast.info('Set N8N_URL and N8N_API_KEY in .env.local');
      } else {
        toast.error('Failed to trigger workflow');
      }
    } catch {
      toast.error('Failed to trigger workflow');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {missingEnv && (
        <Card className="p-4">
          <div className="text-sm text-foreground/80">{missingEnv}</div>
          <div className="text-xs text-foreground/60 mt-1">Add N8N_URL and N8N_API_KEY to apps/web/.env.local</div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="font-medium">Workflows</div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
        {loading && workflows.length === 0 ? (
          <div className="grid gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {workflows.map((w) => (
              <div key={w.id || w._id || w.name} className="flex items-center justify-between gap-3 border border-border rounded px-3 py-2 bg-surface/50">
                <div className="text-sm">
                  <div className="font-medium">{w.name || w.id}</div>
                  <div className="text-xs text-foreground/60">{w.active ? 'active' : 'inactive'}</div>
                </div>
                <Button size="sm" onClick={() => trigger(String(w.id || w._id))} disabled={pendingId !== null}>
                  {pendingId === String(w.id || w._id) ? 'Triggering…' : 'Trigger'}
                </Button>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-sm text-foreground/60">No workflows found.</div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="font-medium mb-3">Recent Executions</div>
        {loading && executions.length === 0 ? (
          <div className="grid gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {executions.map((ex) => (
              <div key={ex.id || ex._id} className="flex items-center justify-between gap-3 border border-border rounded px-3 py-2 bg-surface/50">
                <div className="text-sm">
                  <div className="font-medium">{ex.workflowData?.name || ex.workflowId || ex.id}</div>
                  <div className="text-xs text-foreground/60">{ex.status || ex.finished ? 'finished' : 'running'} • {ex.startedAt ? new Date(ex.startedAt).toLocaleString() : ''}</div>
                </div>
                <div className="text-xs text-foreground/60">{ex.mode || ''}</div>
              </div>
            ))}
            {executions.length === 0 && (
              <div className="text-sm text-foreground/60">No executions.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
