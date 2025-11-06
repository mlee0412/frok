/**
 * Home Assistant WebSocket Connection Manager
 *
 * Manages real-time WebSocket connection to Home Assistant for live state updates.
 * Features:
 * - Auto-reconnect with exponential backoff
 * - State change event subscriptions
 * - Connection status tracking
 * - Automatic authentication
 */

type ConnectionStatus = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error';

interface HAMessage {
  id?: number;
  type: string;
  [key: string]: unknown;
}

interface HAStateChangedEvent {
  event_type: 'state_changed';
  data: {
    entity_id: string;
    new_state: {
      entity_id: string;
      state: string;
      attributes: Record<string, unknown>;
      last_changed: string;
      last_updated: string;
    };
    old_state: {
      entity_id: string;
      state: string;
      attributes: Record<string, unknown>;
      last_changed: string;
      last_updated: string;
    };
  };
  origin: string;
  time_fired: string;
}

type StateChangeCallback = (event: HAStateChangedEvent) => void;
type StatusChangeCallback = (status: ConnectionStatus, error?: string) => void;

export class HAWebSocketManager {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private subscriptionId: number | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
  private statusChangeCallbacks: Set<StatusChangeCallback> = new Set();

  private wsUrl: string | null = null;
  private token: string | null = null;

  constructor() {
    // URLs will be set dynamically when connecting
  }

  /**
   * Connect to Home Assistant WebSocket
   */
  async connect(baseUrl: string, accessToken: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[HA WS] Already connected');
      return;
    }

    this.wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/websocket';
    this.token = accessToken;

    this.setStatus('connecting');
    this.cleanup();

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[HA WS] Connection established');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[HA WS] Connection error:', error);
        this.setStatus('error', 'Connection error');
      };

      this.ws.onclose = () => {
        console.log('[HA WS] Connection closed');
        this.handleDisconnect();
      };
    } catch (error) {
      console.error('[HA WS] Failed to connect:', error);
      this.setStatus('error', String(error));
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from Home Assistant
   */
  disconnect(): void {
    this.cleanup();
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Destroy the manager and clean up all resources
   */
  destroy(): void {
    this.disconnect();
    // Clear all callbacks to prevent memory leaks
    this.stateChangeCallbacks.clear();
    this.statusChangeCallbacks.clear();
    this.wsUrl = null;
    this.token = null;
  }

  /**
   * Subscribe to state change events
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusChangeCallbacks.add(callback);
    // Immediately notify of current status
    callback(this.status);
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  // Private methods

  private handleMessage(data: string): void {
    try {
      const message: HAMessage = JSON.parse(data);

      if (message.type === 'auth_required') {
        this.authenticate();
      } else if (message.type === 'auth_ok') {
        console.log('[HA WS] Authentication successful');
        this.setStatus('connected');
        this.subscribeToEvents();
      } else if (message.type === 'auth_invalid') {
        console.error('[HA WS] Authentication failed');
        this.setStatus('error', 'Authentication failed');
        this.disconnect();
      } else if (message.type === 'event') {
        this.handleEvent(message);
      } else if (message.type === 'result') {
        // Handle subscription result
        if (message['success'] && message.id === this.subscriptionId) {
          console.log('[HA WS] Successfully subscribed to state changes');
        }
      }
    } catch (error) {
      console.error('[HA WS] Failed to parse message:', error);
    }
  }

  private authenticate(): void {
    if (!this.token) {
      this.setStatus('error', 'No access token provided');
      return;
    }

    this.setStatus('authenticating');
    this.sendMessage({
      type: 'auth',
      access_token: this.token,
    });
  }

  private subscribeToEvents(): void {
    this.subscriptionId = this.messageId;
    this.sendMessage({
      id: this.messageId++,
      type: 'subscribe_events',
      event_type: 'state_changed',
    });
  }

  private handleEvent(message: HAMessage): void {
    if (message['event'] && typeof message['event'] === 'object') {
      const event = message['event'] as HAStateChangedEvent;
      if (event.event_type === 'state_changed') {
        this.notifyStateChange(event);
      }
    }
  }

  private notifyStateChange(event: HAStateChangedEvent): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[HA WS] Error in state change callback:', error);
      }
    });
  }

  private setStatus(status: ConnectionStatus, error?: string): void {
    if (this.status !== status) {
      this.status = status;
      console.log(`[HA WS] Status changed to: ${status}${error ? ` (${error})` : ''}`);
      this.statusChangeCallbacks.forEach(callback => {
        try {
          callback(status, error);
        } catch (err) {
          console.error('[HA WS] Error in status change callback:', err);
        }
      });
    }
  }

  private sendMessage(message: HAMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[HA WS] Cannot send message, not connected');
    }
  }

  private handleDisconnect(): void {
    this.setStatus('disconnected');
    this.cleanup();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error('[HA WS] Max reconnect attempts reached');
      this.setStatus('error', 'Max reconnection attempts reached');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 32000);

    console.log(`[HA WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.wsUrl && this.token) {
        this.connect(this.wsUrl.replace('/api/websocket', ''), this.token);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({
          id: this.messageId++,
          type: 'ping',
        });
      }
    }, 30000);
  }

  private cleanup(): void {
    // Clear heartbeat interval first
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clean up WebSocket
    if (this.ws) {
      // Remove all event listeners to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;

      // Close connection if still open or connecting
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        try {
          this.ws.close(1000, 'Normal closure');
        } catch (error) {
          console.error('[HA WS] Error closing WebSocket:', error);
        }
      }

      this.ws = null;
    }

    // Reset state
    this.subscriptionId = null;
    this.messageId = 1;
  }
}

// Singleton instance
let managerInstance: HAWebSocketManager | null = null;

/**
 * Get the singleton WebSocket manager instance
 */
export function getHAWebSocketManager(): HAWebSocketManager {
  if (!managerInstance) {
    managerInstance = new HAWebSocketManager();
  }
  return managerInstance;
}
