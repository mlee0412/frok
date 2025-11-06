import { useEffect, useState, useCallback, useRef } from 'react';
import { getHAWebSocketManager } from './websocket';
import type { Device } from '@frok/clients';

interface HAConnectionConfig {
  baseUrl: string;
  accessToken: string;
  autoConnect?: boolean;
}

interface HAWebSocketState {
  status: 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error';
  error?: string;
  isConnected: boolean;
}

/**
 * React hook for Home Assistant WebSocket connection
 *
 * @example
 * ```tsx
 * const { status, connect, disconnect } = useHAWebSocket({
 *   baseUrl: 'http://homeassistant.local:8123',
 *   accessToken: 'your-token',
 *   autoConnect: true
 * });
 * ```
 */
export function useHAWebSocket(config?: HAConnectionConfig) {
  const [state, setState] = useState<HAWebSocketState>({
    status: 'disconnected',
    isConnected: false,
  });

  const manager = useRef(getHAWebSocketManager());
  const configRef = useRef(config);
  configRef.current = config;

  const connect = useCallback(async (baseUrl?: string, accessToken?: string) => {
    const url = baseUrl || configRef.current?.baseUrl;
    const token = accessToken || configRef.current?.accessToken;

    if (!url || !token) {
      console.error('[useHAWebSocket] Missing baseUrl or accessToken');
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Missing configuration',
        isConnected: false,
      }));
      return;
    }

    await manager.current.connect(url, token);
  }, []);

  const disconnect = useCallback(() => {
    manager.current.disconnect();
  }, []);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = manager.current.onStatusChange((status, error) => {
      setState({
        status,
        error,
        isConnected: status === 'connected',
      });
    });

    return unsubscribe;
  }, []);

  // Auto-connect if configured
  useEffect(() => {
    if (config?.autoConnect && config.baseUrl && config.accessToken) {
      connect();
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive for other components
    };
  }, [config?.autoConnect, config?.baseUrl, config?.accessToken, connect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect: connect,
  };
}

/**
 * React hook for subscribing to entity state changes
 *
 * @example
 * ```tsx
 * useHAEntityUpdates((event) => {
 *   console.log('Entity updated:', event.data.entity_id, event.data.new_state);
 * }, ['light.living_room', 'switch.kitchen']);
 * ```
 */
export function useHAEntityUpdates(
  onUpdate: (event: {
    entity_id: string;
    new_state: Device;
    old_state: Device;
  }) => void,
  entityIds?: string[]
) {
  const manager = useRef(getHAWebSocketManager());

  useEffect(() => {
    const unsubscribe = manager.current.onStateChange((event) => {
      // Filter by entity IDs if provided
      if (entityIds && !entityIds.includes(event.data.entity_id)) {
        return;
      }

      // Convert HA state to Device format
      const newState = event.data.new_state;
      const oldState = event.data.old_state;

      onUpdate({
        entity_id: event.data.entity_id,
        new_state: {
          id: newState.entity_id,
          name: (newState.attributes['friendly_name'] as string) || newState.entity_id,
          type: newState.entity_id.split('.')[0],
          state: newState.state,
          attrs: newState.attributes,
          online: newState.state !== 'unavailable',
        } as Device,
        old_state: {
          id: oldState.entity_id,
          name: (oldState.attributes['friendly_name'] as string) || oldState.entity_id,
          type: oldState.entity_id.split('.')[0],
          state: oldState.state,
          attrs: oldState.attributes,
          online: oldState.state !== 'unavailable',
        } as Device,
      });
    });

    return unsubscribe;
  }, [onUpdate, entityIds]);
}

/**
 * React hook for managing device list with live updates
 *
 * @example
 * ```tsx
 * const { devices, updateDevice } = useHADevices(initialDevices);
 * ```
 */
export function useHADevices(initialDevices: Device[]) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);

  // Update devices array when new data comes in
  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);

  // Subscribe to entity updates and merge them into devices
  useHAEntityUpdates((event) => {
    setDevices(prevDevices => {
      const index = prevDevices.findIndex(d => d.id === event.entity_id);
      if (index === -1) {
        // Device not in list, ignore
        return prevDevices;
      }

      // Create new array with updated device
      const newDevices = [...prevDevices];
      newDevices[index] = {
        ...newDevices[index],
        ...event.new_state,
      };
      return newDevices;
    });
  });

  const updateDevice = useCallback((entityId: string, updates: Partial<Device>) => {
    setDevices(prevDevices => {
      const index = prevDevices.findIndex(d => d.id === entityId);
      if (index === -1) return prevDevices;

      const newDevices = [...prevDevices];
      newDevices[index] = {
        ...newDevices[index],
        ...updates,
      } as Device;
      return newDevices;
    });
  }, []);

  return {
    devices,
    updateDevice,
    setDevices,
  };
}
