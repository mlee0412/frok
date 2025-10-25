'use client';
import * as React from 'react';
import { Card, useToast } from '@frok/ui';

type SystemEvent = {
  ts: number;
  uptime_s: number;
  ha_ok: boolean;
  ha_latency_ms: number;
  db_ok: boolean;
  db_latency_ms: number;
};

export default function SystemHealthClient() {
  const [data, setData] = React.useState<SystemEvent | null>(null);
  const [connected, setConnected] = React.useState(false);
  const toast = useToast();
  const prev = React.useRef<SystemEvent | null>(null);
  const first = React.useRef(true);
  const wasDisconnected = React.useRef(false);

  React.useEffect(() => {
    const es = new EventSource('/api/system/stream');
    const onOpen = () => {
      setConnected(true);
      if (wasDisconnected.current) {
        wasDisconnected.current = false;
        toast.success('Reconnected to system stream');
      }
    };
    const onError = () => {
      if (!wasDisconnected.current) {
        wasDisconnected.current = true;
        toast.error('System stream disconnected');
      }
      setConnected(false);
    };
    const onMessage = (ev: MessageEvent) => {
      // default event
      try {
        const j = JSON.parse(ev.data);
        if (j && typeof j === 'object' && 'uptime_s' in j) handleUpdate(j as SystemEvent);
      } catch {}
    };
    const onSystem = (ev: MessageEvent) => {
      try {
        const j = JSON.parse(ev.data);
        handleUpdate(j as SystemEvent);
      } catch {}
    };

    function handleUpdate(next: SystemEvent) {
      const prevVal = prev.current;
      setData(next);
      prev.current = next;
      if (first.current) {
        first.current = false;
        // show immediate degradation on first event
        if (!next.ha_ok) toast.error('Home Assistant is unreachable');
        if (!next.db_ok) toast.error('Database is unreachable');
        return;
      }
      if (prevVal) {
        // Degradation notifications
        if (prevVal.ha_ok && !next.ha_ok) toast.error('Home Assistant became unreachable');
        if (prevVal.db_ok && !next.db_ok) toast.error('Database became unreachable');
        // Recovery notifications
        if (!prevVal.ha_ok && next.ha_ok) toast.success('Home Assistant connectivity restored');
        if (!prevVal.db_ok && next.db_ok) toast.success('Database connectivity restored');
      }
    }

    es.addEventListener('open', onOpen as any);
    es.addEventListener('error', onError as any);
    es.addEventListener('message', onMessage as any);
    es.addEventListener('system', onSystem as any);
    return () => {
      es.removeEventListener('open', onOpen as any);
      es.removeEventListener('error', onError as any);
      es.removeEventListener('message', onMessage as any);
      es.removeEventListener('system', onSystem as any);
      es.close();
    };
  }, [toast]);

  const ha = data?.ha_ok;
  const db = data?.db_ok;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="p-4">
        <div className="text-xs text-foreground/60">Connection</div>
        <div className="text-lg font-semibold">{connected ? 'Connected' : 'Connecting…'}</div>
        <div className="text-xs text-foreground/60">Uptime: {data ? `${data.uptime_s}s` : '-'}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-foreground/60">Home Assistant</div>
        <div className={["text-lg font-semibold", ha ? 'text-success' : 'text-danger'].join(' ')}>{ha ? 'OK' : 'Fail'}</div>
        <div className="text-xs text-foreground/60">Latency: {data ? `${data.ha_latency_ms} ms` : '-'}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-foreground/60">Database</div>
        <div className={["text-lg font-semibold", db ? 'text-success' : 'text-danger'].join(' ')}>{db ? 'OK' : 'Fail'}</div>
        <div className="text-xs text-foreground/60">Latency: {data ? `${data.db_latency_ms} ms` : '-'}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-foreground/60">Timestamp</div>
        <div className="text-lg font-semibold">{data ? new Date(data.ts).toLocaleTimeString() : '-'}</div>
      </Card>
    </div>
  );
}
