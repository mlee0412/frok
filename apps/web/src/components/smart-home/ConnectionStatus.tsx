'use client';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@frok/ui';
import { useHAWebSocket } from '@/lib/homeassistant/useHAWebSocket';

export interface ConnectionStatusProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Home Assistant base URL
   */
  baseUrl?: string;

  /**
   * Access token for authentication
   */
  accessToken?: string;

  /**
   * Whether to show as compact badge or full status with reconnect button
   * @default 'badge'
   */
  variant?: 'badge' | 'full';

  /**
   * Callback when reconnect is clicked
   */
  onReconnect?: () => void;
}

/**
 * ConnectionStatus - Visual indicator for Home Assistant WebSocket connection
 *
 * Features:
 * - Real-time connection status (connected/connecting/disconnected/error)
 * - Color-coded indicators (green/yellow/red)
 * - Manual reconnect button
 * - Compact badge or full status display
 * - Automatic status updates
 *
 * @example
 * ```tsx
 * <ConnectionStatus
 *   baseUrl={process.env.NEXT_PUBLIC_HA_URL}
 *   accessToken={token}
 *   variant="badge"
 * />
 * ```
 */
export const ConnectionStatus = forwardRef<HTMLDivElement, ConnectionStatusProps>(
  (
    {
      baseUrl,
      accessToken,
      variant = 'badge',
      onReconnect,
      className,
      ...props
    },
    ref
  ) => {
    const { status, error, isConnected, reconnect } = useHAWebSocket(
      baseUrl && accessToken
        ? {
            baseUrl,
            accessToken,
            autoConnect: false, // Manual connect via parent component
          }
        : undefined
    );

    const handleReconnect = () => {
      if (baseUrl && accessToken) {
        reconnect(baseUrl, accessToken);
      }
      onReconnect?.();
    };

    // Get status display info
    const getStatusInfo = () => {
      switch (status) {
        case 'connected':
          return {
            icon: Wifi,
            label: 'Connected',
            color: 'text-success',
            bgColor: 'bg-success/10',
            borderColor: 'border-success/30',
          };
        case 'connecting':
        case 'authenticating':
          return {
            icon: Loader2,
            label: 'Connecting...',
            color: 'text-warning',
            bgColor: 'bg-warning/10',
            borderColor: 'border-warning/30',
            spin: true,
          };
        case 'error':
          return {
            icon: AlertCircle,
            label: error || 'Connection Error',
            color: 'text-danger',
            bgColor: 'bg-danger/10',
            borderColor: 'border-danger/30',
          };
        case 'disconnected':
        default:
          return {
            icon: WifiOff,
            label: 'Disconnected',
            color: 'text-foreground/40',
            bgColor: 'bg-surface',
            borderColor: 'border-border',
          };
      }
    };

    const statusInfo = getStatusInfo();
    const Icon = statusInfo.icon;

    if (variant === 'badge') {
      return (
        <div
          ref={ref}
          className={`
            inline-flex items-center gap-2
            px-3 py-1.5 rounded-full
            border ${statusInfo.borderColor}
            ${statusInfo.bgColor}
            transition-all duration-200
            ${className || ''}
          `}
          title={statusInfo.label}
          {...props}
        >
          <Icon
            size={14}
            className={`${statusInfo.color} ${statusInfo.spin ? 'animate-spin' : ''}`}
          />
          <span className={`text-xs font-medium ${statusInfo.color}`}>
            {isConnected ? 'Live' : status === 'connecting' ? 'Sync...' : 'Offline'}
          </span>
        </div>
      );
    }

    // Full variant with reconnect button
    return (
      <div
        ref={ref}
        className={`
          flex items-center justify-between gap-3
          p-3 rounded-lg
          border ${statusInfo.borderColor}
          ${statusInfo.bgColor}
          transition-all duration-200
          ${className || ''}
        `}
        {...props}
      >
        <div className="flex items-center gap-3">
          <Icon
            size={20}
            className={`${statusInfo.color} ${statusInfo.spin ? 'animate-spin' : ''}`}
          />
          <div>
            <div className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </div>
            {error && status === 'error' && (
              <div className="text-xs text-foreground/60 mt-0.5">
                {error}
              </div>
            )}
          </div>
        </div>

        {!isConnected && status !== 'connecting' && (
          <Button
            variant="outline"
            onClick={handleReconnect}
            className="h-8 text-xs"
            disabled={status === 'authenticating'}
          >
            Reconnect
          </Button>
        )}
      </div>
    );
  }
);

ConnectionStatus.displayName = 'ConnectionStatus';
