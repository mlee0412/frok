'use client';

/**
 * HA Sync Settings Component
 *
 * Provides UI for syncing Home Assistant entities to local database.
 *
 * Features:
 * - Manual sync trigger with loading state
 * - Display sync statistics (entity count, last sync time)
 * - Auto-sync toggle (on app startup)
 * - Sync history/errors
 */

import { useState, useEffect } from 'react';
import { Button } from '@frok/ui';

interface SyncStats {
  lastSyncTime: string | null;
  entityCount: number;
  deviceCount: number;
  areaCount: number;
}

export function HASyncSettings() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [stats, setStats] = useState<SyncStats>({
    lastSyncTime: null,
    entityCount: 0,
    deviceCount: 0,
    areaCount: 0,
  });
  const [autoSync, setAutoSync] = useState(false);

  // Clear feedback after 5 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  // Load auto-sync preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('frok-ha-auto-sync');
    setAutoSync(saved === 'true');
  }, []);

  // Save auto-sync preference
  const handleAutoSyncToggle = (enabled: boolean) => {
    console.log('[HASyncSettings] Auto-sync toggled:', enabled);
    setAutoSync(enabled);
    localStorage.setItem('frok-ha-auto-sync', enabled.toString());
    setFeedbackMessage({
      type: 'success',
      text: enabled ? 'Auto-sync enabled' : 'Auto-sync disabled'
    });
  };

  // Trigger manual sync
  const handleSync = async () => {
    console.log('[HASyncSettings] Starting manual sync...');
    setIsSyncing(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch('/api/ha/sync/registries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('[HASyncSettings] Sync response:', data);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Sync failed with status ${response.status}`);
      }

      // Update stats
      const newStats = {
        lastSyncTime: new Date().toISOString(),
        entityCount: data.entities || 0,
        deviceCount: data.devices || 0,
        areaCount: data.areas || 0,
      };
      setStats(newStats);
      console.log('[HASyncSettings] Stats updated:', newStats);

      setFeedbackMessage({
        type: 'success',
        text: `Synced ${data.entities || 0} entities, ${data.devices || 0} devices, ${data.areas || 0} areas`
      });
    } catch (err: unknown) {
      console.error('[HASyncSettings] Sync error:', err);
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to sync. Please try again.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync on mount if enabled
  useEffect(() => {
    if (autoSync) {
      console.log('[HASyncSettings] Auto-sync enabled, triggering sync...');
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return (
    <div className="bg-surface border border-border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">🔄 Entity Registry Sync</h2>
        <p className="text-sm text-foreground/70">
          Sync areas, devices, and entities from Home Assistant to local database
        </p>
      </div>

      {/* Statistics */}
      {stats.lastSyncTime && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-xs text-foreground/60 mb-1">Entities</p>
            <p className="text-2xl font-semibold text-primary">{stats.entityCount}</p>
          </div>
          <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
            <p className="text-xs text-foreground/60 mb-1">Devices</p>
            <p className="text-2xl font-semibold text-info">{stats.deviceCount}</p>
          </div>
          <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
            <p className="text-xs text-foreground/60 mb-1">Areas</p>
            <p className="text-2xl font-semibold text-success">{stats.areaCount}</p>
          </div>
        </div>
      )}

      {/* Last Sync Time */}
      {stats.lastSyncTime && (
        <div className="text-sm text-foreground/60">
          Last synced:{' '}
          <span className="text-foreground">
            {new Date(stats.lastSyncTime).toLocaleString()}
          </span>
        </div>
      )}

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          feedbackMessage.type === 'success'
            ? 'bg-success/10 border border-success/30 text-success'
            : 'bg-danger/10 border border-danger/30 text-danger'
        }`}>
          {feedbackMessage.type === 'success' ? '✓' : '✗'} {feedbackMessage.text}
        </div>
      )}

      {/* Manual Sync Button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          variant="primary"
          className="flex-1 sm:flex-none"
        >
          {isSyncing ? (
            <>
              <div className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Syncing...
            </>
          ) : (
            '🔄 Sync Now'
          )}
        </Button>

        {/* Auto-Sync Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => handleAutoSyncToggle(e.target.checked)}
            disabled={isSyncing}
            className="w-4 h-4 rounded border-border bg-surface checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Enable auto-sync on app start"
          />
          <span className="text-sm text-foreground/70">Auto-sync on app start</span>
        </label>
      </div>

      {/* Info Note */}
      <div className="p-3 bg-info/10 border border-info/30 rounded-lg text-sm text-info">
        ℹ️ Syncing creates or updates entity records in the local database for faster queries and
        offline access.
      </div>
    </div>
  );
}
