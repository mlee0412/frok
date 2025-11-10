/**
 * WebSocket Manager - Client-side WebSocket Connection
 *
 * Manages WebSocket connection with automatic reconnection and error handling.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queue during reconnection
 * - Connection state management
 * - Type-safe message handling
 */

import type { VoiceMessage, WebSocketConfig } from '@/types/voice';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private isConnecting = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 1000, // 1 second
      maxReconnectAttempts: 5,
      onError: () => {}, // Default no-op
      onOpen: () => {}, // Default no-op
      onClose: () => {}, // Default no-op
      ...config,
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Establish WebSocket connection
   */
  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      // Use configured URL or build from window.location
      const wsUrl = this.buildWebSocketUrl();

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocketManager] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.config.onOpen?.();

        // Flush message queue
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: VoiceMessage = JSON.parse(event.data);
          this.config.onMessage(message);
        } catch (error) {
          console.error('[WebSocketManager] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocketManager] Error:', error);
        this.config.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('[WebSocketManager] Disconnected');
        this.isConnecting = false;
        this.config.onClose?.();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocketManager] Connection failed:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Send message to server
   */
  send(message: Record<string, unknown>) {
    const data = JSON.stringify(message);

    if (this.isConnected()) {
      this.ws!.send(data);
    } else {
      // Queue message for later
      this.messageQueue.push(data);

      // Attempt to reconnect if not already
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.ws!.send(message);
    }
  }

  // ============================================================================
  // Reconnection Logic
  // ============================================================================

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocketManager] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(
      `[WebSocketManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Build WebSocket URL - supports both Railway deployment and local development
   */
  private buildWebSocketUrl(): string {
    // Check for configured WebSocket URL (Railway deployment)
    const configuredUrl = process.env['NEXT_PUBLIC_VOICE_WS_URL'];

    if (configuredUrl) {
      // Use configured URL (e.g., wss://voice-server.railway.app/voice/stream)
      console.log('[WebSocketManager] Using configured WebSocket URL');
      return configuredUrl;
    }

    // Fallback: Build from window.location (local development)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}${this.config.url}`;
    console.log('[WebSocketManager] Using local WebSocket URL:', wsUrl);
    return wsUrl;
  }
}
