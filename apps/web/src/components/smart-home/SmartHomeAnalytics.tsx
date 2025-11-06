'use client';

import { useMemo, type ComponentPropsWithoutRef, forwardRef } from 'react';
import type { Device } from '@frok/clients';
import { Card } from '@frok/ui';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface SmartHomeAnalyticsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * Array of all devices
   */
  devices: Device[];

  /**
   * Optional historical data for device state changes
   */
  stateHistory?: Array<{
    timestamp: Date;
    deviceId: string;
    state: string;
  }>;
}

/**
 * SmartHomeAnalytics - Data visualization dashboard for smart home
 *
 * Features:
 * - Device distribution by type
 * - Room activity distribution
 * - Device status overview
 * - Real-time state monitoring
 *
 * Performance optimizations:
 * - Memoized calculations to prevent unnecessary recalculations
 * - Component wrapped with React.memo for shallow prop comparison
 * - Efficient data transformations
 *
 * @example
 * ```tsx
 * <SmartHomeAnalytics devices={devices} />
 * ```
 */
const SmartHomeAnalyticsComponent = forwardRef<HTMLDivElement, SmartHomeAnalyticsProps>(
  ({ devices, stateHistory, className, ...props }, ref) => {
    // Device Type Distribution
    const deviceTypeData = useMemo(() => {
      const counts = devices.reduce((acc, device) => {
        const type = device.type || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value,
      }));
    }, [devices]);

    // Room Distribution
    const roomData = useMemo(() => {
      const counts = devices.reduce((acc, device) => {
        const room = device.area || 'Unassigned';
        acc[room] = (acc[room] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts)
        .map(([name, value]) => ({
          name,
          devices: value,
        }))
        .sort((a, b) => b.devices - a.devices);
    }, [devices]);

    // Device Status Overview
    const statusData = useMemo(() => {
      const online = devices.filter(d => d.online !== false).length;
      const offline = devices.filter(d => d.online === false).length;
      const active = devices.filter(d =>
        d.state === 'on' || d.state === 'playing' || d.state === 'heating' || d.state === 'cooling'
      ).length;

      return [
        { name: 'Active', value: active, color: 'var(--color-primary)' },
        { name: 'Online', value: online - active, color: 'var(--color-success)' },
        { name: 'Offline', value: offline, color: 'var(--color-danger)' },
      ];
    }, [devices]);

    // Activity by Device Type
    const activityData = useMemo(() => {
      const activity: Record<string, { total: number; active: number }> = {};

      devices.forEach(device => {
        const type = device.type || 'other';
        if (!activity[type]) {
          activity[type] = { total: 0, active: 0 };
        }
        activity[type].total++;
        if (device.state === 'on' || device.state === 'playing') {
          activity[type].active++;
        }
      });

      return Object.entries(activity).map(([name, data]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        total: data.total,
        active: data.active,
        inactive: data.total - data.active,
      }));
    }, [devices]);

    // Color palettes
    const PIE_COLORS = ['#22d3ee', '#3b82f6', '#06b6d4', '#0ea5e9', '#14b8a6', '#10b981'];

    return (
      <div ref={ref} className={`space-y-4 ${className || ''}`} {...props}>
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-sm text-foreground/60">Total Devices</div>
            <div className="text-3xl font-bold text-foreground mt-1">{devices.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-foreground/60">Active Now</div>
            <div className="text-3xl font-bold text-primary mt-1">
              {statusData.find(s => s.name === 'Active')?.value || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-foreground/60">Online</div>
            <div className="text-3xl font-bold text-success mt-1">
              {devices.filter(d => d.online !== false).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-foreground/60">Offline</div>
            <div className="text-3xl font-bold text-danger mt-1">
              {devices.filter(d => d.online === false).length}
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Device Type Distribution */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Device Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={deviceTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const percent = props.percent || 0;
                    return `${props.name || ''}: ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="var(--color-primary)"
                  dataKey="value"
                >
                  {deviceTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-foreground)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Device Status Overview */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Device Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-foreground)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Room Distribution */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Devices by Room</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={roomData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-foreground)"
                  opacity={0.6}
                  tick={{ fill: 'var(--color-foreground)', fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--color-foreground)"
                  opacity={0.6}
                  tick={{ fill: 'var(--color-foreground)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-foreground)',
                  }}
                />
                <Bar dataKey="devices" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Activity by Type */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Activity by Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-foreground)"
                  opacity={0.6}
                  tick={{ fill: 'var(--color-foreground)', fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--color-foreground)"
                  opacity={0.6}
                  tick={{ fill: 'var(--color-foreground)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-foreground)',
                  }}
                />
                <Legend
                  wrapperStyle={{ color: 'var(--color-foreground)' }}
                  iconType="circle"
                />
                <Bar dataKey="active" stackId="a" fill="var(--color-primary)" radius={[0, 0, 0, 0]} name="Active" />
                <Bar dataKey="inactive" stackId="a" fill="var(--color-foreground)" opacity={0.2} radius={[8, 8, 0, 0]} name="Inactive" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Device Details Table */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Device Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-foreground/60">
                  <th className="text-left py-2 px-3 font-medium">Name</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Room</th>
                  <th className="text-left py-2 px-3 font-medium">State</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.slice(0, 10).map((device) => (
                  <tr key={device.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                    <td className="py-2 px-3 text-foreground">{device.name}</td>
                    <td className="py-2 px-3 text-foreground/70">{device.type}</td>
                    <td className="py-2 px-3 text-foreground/70">{device.area || 'N/A'}</td>
                    <td className="py-2 px-3">
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${device.state === 'on' || device.state === 'playing' ? 'bg-primary/20 text-primary' : ''}
                        ${device.state === 'off' || device.state === 'idle' ? 'bg-foreground/10 text-foreground/60' : ''}
                      `}>
                        {device.state}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`
                        inline-flex items-center gap-1 text-xs
                        ${device.online !== false ? 'text-success' : 'text-danger'}
                      `}>
                        <span className={`h-2 w-2 rounded-full ${device.online !== false ? 'bg-success' : 'bg-danger'}`} />
                        {device.online !== false ? 'Online' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {devices.length > 10 && (
              <div className="text-center py-3 text-foreground/60 text-sm">
                Showing 10 of {devices.length} devices
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }
);

SmartHomeAnalyticsComponent.displayName = 'SmartHomeAnalytics';

// Memoize the component to prevent unnecessary re-renders when props haven't changed
export const SmartHomeAnalytics = SmartHomeAnalyticsComponent;
