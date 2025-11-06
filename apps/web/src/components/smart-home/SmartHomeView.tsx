'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Device } from '@frok/clients';
import { Card } from '@frok/ui';
import SyncButtons from '@/components/smart-home/SyncButtons';
import { RoomCard } from '@/components/smart-home/RoomCard';
import { QuickActionCard } from '@/components/smart-home/QuickActionCard';
import type { QuickAction } from '@/components/smart-home/QuickActionCard';
import { ConnectionStatus } from '@/components/smart-home/ConnectionStatus';
import { callHAService, turnOn, sceneTurnOn, scriptTurnOn } from '@frok/clients';
import { useHAWebSocket, useHADevices } from '@/lib/homeassistant/useHAWebSocket';

export default function SmartHomeView({ initialDevices, haOk, haDetail }: { initialDevices: Device[]; haOk: boolean; haDetail?: string }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollMs, setPollMs] = useState<number>(4000);
  const [useWebSocket] = useState(true);
  const timer = useRef<number | null>(null);

  // Use WebSocket for real-time updates
  const { devices, updateDevice } = useHADevices(initialDevices);

  // Connect to WebSocket if enabled
  const wsBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const { connect: wsConnect, isConnected } = useHAWebSocket();

  // Connect to WebSocket on mount if HA is available
  useEffect(() => {
    if (haOk && useWebSocket && wsBaseUrl) {
      // Fetch HA credentials from API and connect
      fetch('/api/ha/config')
        .then(res => res.json())
        .then(config => {
          if (config.baseUrl && config.token) {
            wsConnect(config.baseUrl, config.token);
          }
        })
        .catch(err => {
          console.error('[SmartHomeView] Failed to fetch HA config:', err);
        });
    }
  }, [haOk, useWebSocket, wsBaseUrl, wsConnect]);

  // Fallback polling only if WebSocket is not connected
  useEffect(() => {
    if (isConnected) {
      // WebSocket is connected, no need to poll
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      return;
    }

    // Poll when WebSocket is not available
    function schedule() {
      timer.current = window.setTimeout(async () => {
        try {
          const r = await fetch('/api/devices', { cache: 'no-store' });
          if (r.ok) {
            const j = await r.json();
            if (Array.isArray(j)) {
              setLastUpdated(new Date());
              // Note: devices are now managed by useHADevices hook
            }
          }
        } catch {}
        schedule();
      }, pollMs) as unknown as number;
    }
    schedule();
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [pollMs, isConnected]);

  const groups = useMemo(() => {
    const m = new Map<string, Device[]>();
    for (const d of devices) {
      const key = d.area && d.area.trim() ? d.area : 'Other';
      const arr = m.get(key) || [];
      arr.push(d);
      m.set(key, arr);
    }
    return m;
  }, [devices]);

  const areas = useMemo(() => Array.from(groups.keys()).sort((a, b) => a.localeCompare(b)), [groups]);

  const lightsOn = useMemo(() => devices.filter((d) => (d.type === 'light' || d.type === 'switch') && (d.state === 'on')).length, [devices]);
  const mediaPlaying = useMemo(() => devices.filter((d) => d.type === 'media_player' && (d.state === 'playing')).length, [devices]);
  const hvacActions = useMemo(() => devices.filter((d) => d.type === 'climate').map((d) => String(((d.attrs || {})['hvac_action'] || '')).toLowerCase()), [devices]);
  const heating = useMemo(() => hvacActions.filter((a) => a === 'heating').length, [hvacActions]);
  const cooling = useMemo(() => hvacActions.filter((a) => a === 'cooling').length, [hvacActions]);

  const allLightIds = useMemo(() => devices.filter((d) => d.type === 'light').map((d) => d.id), [devices]);
  const scenes = useMemo(() => devices.filter((d) => d.type === 'scene'), [devices]);
  const scripts = useMemo(() => devices.filter((d) => d.type === 'script'), [devices]);

  async function quick(action: 'all_on' | 'all_off') {
    if (allLightIds.length === 0) return;

    // Optimistic update
    const targetState = action === 'all_on' ? 'on' : 'off';
    allLightIds.forEach(id => {
      updateDevice(id, { state: targetState });
    });

    try {
      if (action === 'all_on') {
        await turnOn(allLightIds, 'light');
      } else {
        await callHAService({ domain: 'light', service: 'turn_off', entity_id: allLightIds });
      }
      setLastUpdated(new Date());
    } catch {
      // Revert optimistic update on error - WebSocket will sync actual state
      console.error('[SmartHomeView] Failed to execute quick action');
    }
  }

  async function runScene(id: string) {
    try {
      await sceneTurnOn(id);
      setLastUpdated(new Date());
    } catch {}
  }

  async function runScript(id: string) {
    try {
      await scriptTurnOn(id);
      setLastUpdated(new Date());
    } catch {}
  }

  // Quick actions for QuickActionCard
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'all-on',
      label: 'All Lights On',
      icon: 'lightbulb',
      variant: 'outline',
      onAction: () => quick('all_on'),
    },
    {
      id: 'all-off',
      label: 'All Lights Off',
      icon: 'power',
      variant: 'outline',
      onAction: () => quick('all_off'),
    },
  ], [quick]);

  // Helper function to turn on all lights in a room
  const turnOnRoomLights = async (area: string) => {
    const areaDevices = groups.get(area) || [];
    const lightIds = areaDevices.filter(d => d.type === 'light').map(d => d.id);
    if (lightIds.length === 0) return;

    // Optimistic update
    lightIds.forEach(id => {
      updateDevice(id, { state: 'on' });
    });

    try {
      await turnOn(lightIds, 'light');
      setLastUpdated(new Date());
    } catch {
      console.error('[SmartHomeView] Failed to turn on room lights');
    }
  };

  // Helper function to turn off all lights in a room
  const turnOffRoomLights = async (area: string) => {
    const areaDevices = groups.get(area) || [];
    const lightIds = areaDevices.filter(d => d.type === 'light').map(d => d.id);
    if (lightIds.length === 0) return;

    // Optimistic update
    lightIds.forEach(id => {
      updateDevice(id, { state: 'off' });
    });

    try {
      await callHAService({ domain: 'light', service: 'turn_off', entity_id: lightIds });
      setLastUpdated(new Date());
    } catch {
      console.error('[SmartHomeView] Failed to turn off room lights');
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Header Card */}
      <Card>
        <div className="p-4 space-y-3">
          {/* HA Status */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="font-medium">Home Assistant</div>
              <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${haOk ? 'border-success/40 text-success bg-success/10' : 'border-danger/40 text-danger bg-danger/10'}`}>
                {haOk ? 'API Ready' : 'Disconnected'}
              </span>
              {/* WebSocket Status */}
              {haOk && useWebSocket && (
                <ConnectionStatus variant="badge" />
              )}
            </div>
            <div className="text-sm text-foreground/60">{haDetail || ''}</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="space-y-1">
              <div className="text-foreground/60">Devices</div>
              <div className="text-lg font-semibold">{devices.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-foreground/60">Lights On</div>
              <div className="text-lg font-semibold text-primary">{lightsOn}</div>
            </div>
            <div className="space-y-1">
              <div className="text-foreground/60">Media Playing</div>
              <div className="text-lg font-semibold text-primary">{mediaPlaying}</div>
            </div>
            <div className="space-y-1">
              <div className="text-foreground/60">Climate Active</div>
              <div className="text-lg font-semibold text-primary">{heating + cooling}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="text-sm text-foreground/60">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Not synced'}
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-sm">Poll</span>
                <select
                  className="border border-border rounded px-2 py-1 text-sm bg-transparent"
                  value={pollMs}
                  onChange={(e) => setPollMs(Number(e.currentTarget.value))}
                >
                  <option value={3000}>3s</option>
                  <option value={4000}>4s</option>
                  <option value={5000}>5s</option>
                  <option value={8000}>8s</option>
                  <option value={15000}>15s</option>
                </select>
              </div>
            </div>
            <SyncButtons />
          </div>
        </div>
      </Card>

      {/* Quick Actions Card */}
      <QuickActionCard
        title="Quick Actions"
        description="Control lights globally or run scenes and scripts"
        actions={quickActions}
        scenes={scenes}
        scripts={scripts}
        onSceneActivate={runScene}
        onScriptRun={runScript}
        layout="grid"
      />

      {/* Room Cards */}
      <div className="space-y-4">
        {areas.map((area) => (
          <RoomCard
            key={area}
            room={area}
            devices={groups.get(area) || []}
            onAllLightsOn={() => turnOnRoomLights(area)}
            onAllLightsOff={() => turnOffRoomLights(area)}
            initiallyExpanded={areas.length <= 3}
          />
        ))}
      </div>
    </div>
  );
}
