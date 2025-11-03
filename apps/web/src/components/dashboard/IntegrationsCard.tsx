'use client';

/**
 * IntegrationsCard Component
 *
 * Displays the status of connected external services and integrations.
 * Shows connection health for GitHub, Home Assistant, Supabase, and OpenWeather.
 *
 * Features:
 * - Real-time status indicators
 * - Last checked timestamp
 * - Quick actions (refresh)
 * - Auto-refresh every 60 seconds
 */

import React from 'react';
import { Card } from '@frok/ui';

type IntegrationStatus = {
  name: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'checking';
  lastChecked?: string;
  error?: string;
};

export function IntegrationsCard() {
  const [integrations, setIntegrations] = React.useState<IntegrationStatus[]>([
    { name: 'Home Assistant', icon: '🏠', status: 'checking' },
    { name: 'GitHub', icon: '💻', status: 'checking' },
    { name: 'Supabase', icon: '🗄️', status: 'checking' },
    { name: 'OpenWeather', icon: '🌤️', status: 'checking' },
  ]);
  const [loading, setLoading] = React.useState(true);

  const checkIntegrationStatus = React.useCallback(async () => {
    setLoading(true);
    const results: IntegrationStatus[] = [];

    // Check Home Assistant
    try {
      const haRes = await fetch('/api/ha/ping', { method: 'POST' });
      const haData = await haRes.json();
      results.push({
        name: 'Home Assistant',
        icon: '🏠',
        status: haData.ok ? 'connected' : 'disconnected',
        lastChecked: new Date().toISOString(),
        error: haData.ok ? undefined : haData.error,
      });
    } catch {
      results.push({
        name: 'Home Assistant',
        icon: '🏠',
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
        error: 'Connection failed',
      });
    }

    // Check GitHub
    try {
      const ghRes = await fetch('/api/github/ping', { method: 'POST' });
      const ghData = await ghRes.json();
      results.push({
        name: 'GitHub',
        icon: '💻',
        status: ghData.ok ? 'connected' : 'disconnected',
        lastChecked: new Date().toISOString(),
        error: ghData.ok ? undefined : ghData.error,
      });
    } catch {
      results.push({
        name: 'GitHub',
        icon: '💻',
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
        error: 'Connection failed',
      });
    }

    // Check Supabase
    try {
      const sbRes = await fetch('/api/supabase/ping', { method: 'POST' });
      const sbData = await sbRes.json();
      results.push({
        name: 'Supabase',
        icon: '🗄️',
        status: sbData.ok ? 'connected' : 'disconnected',
        lastChecked: new Date().toISOString(),
        error: sbData.ok ? undefined : sbData.error,
      });
    } catch {
      results.push({
        name: 'Supabase',
        icon: '🗄️',
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
        error: 'Connection failed',
      });
    }

    // Check OpenWeather (if API key is configured)
    try {
      const weatherRes = await fetch('/api/weather?location=Seoul&type=current&units=metric');
      const weatherData = await weatherRes.json();
      results.push({
        name: 'OpenWeather',
        icon: '🌤️',
        status: weatherData.ok ? 'connected' : 'disconnected',
        lastChecked: new Date().toISOString(),
        error: weatherData.ok ? undefined : weatherData.error,
      });
    } catch {
      results.push({
        name: 'OpenWeather',
        icon: '🌤️',
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
        error: 'Not configured',
      });
    }

    setIntegrations(results);
    setLoading(false);
  }, []);

  // Initial check
  React.useEffect(() => {
    checkIntegrationStatus();
  }, [checkIntegrationStatus]);

  // Auto-refresh every 60 seconds
  React.useEffect(() => {
    const interval = setInterval(checkIntegrationStatus, 60000);
    return () => clearInterval(interval);
  }, [checkIntegrationStatus]);

  const getStatusColor = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'text-success';
      case 'disconnected':
        return 'text-danger';
      case 'checking':
        return 'text-foreground/40';
      default:
        return 'text-foreground/40';
    }
  };

  const getStatusIcon = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected':
        return '✓';
      case 'disconnected':
        return '✗';
      case 'checking':
        return '⋯';
      default:
        return '?';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-foreground">🔗 Integrations</div>
        <button
          onClick={checkIntegrationStatus}
          className="text-xs text-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
          disabled={loading}
          aria-label="Refresh integration status"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-2">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between p-2 bg-surface-lighter/50 rounded"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{integration.icon}</span>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {integration.name}
                </div>
                {integration.error && (
                  <div className="text-xs text-danger/80 mt-0.5">
                    {integration.error}
                  </div>
                )}
              </div>
            </div>
            <div
              className={`text-lg font-bold ${getStatusColor(integration.status)}`}
              title={
                integration.status === 'checking'
                  ? 'Checking...'
                  : integration.status === 'connected'
                    ? 'Connected'
                    : 'Disconnected'
              }
            >
              {getStatusIcon(integration.status)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
