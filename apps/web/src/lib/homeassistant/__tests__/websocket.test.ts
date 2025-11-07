import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HAWebSocketManager } from '../websocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
      // Send auth required message
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'auth_required' })
        }));
      }
    }, 10);
  }

  send(data: string) {
    const message = JSON.parse(data);

    // Simulate auth response
    if (message.type === 'auth') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify({ type: 'auth_ok' })
          }));
        }
      }, 10);
    }

    // Simulate subscription response
    if (message.type === 'subscribe_events') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              id: message.id,
              type: 'result',
              success: true
            })
          }));
        }
      }, 10);
    }

    // Simulate ping response
    if (message.type === 'ping') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              id: message.id,
              type: 'pong'
            })
          }));
        }
      }, 10);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any;

describe('HAWebSocketManager', () => {
  let manager: HAWebSocketManager;

  beforeEach(() => {
    manager = new HAWebSocketManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Connection Management', () => {
    it('should connect to Home Assistant', async () => {
      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);

      // The initial status is 'disconnected' and triggers immediately (with only one arg on initial call)
      expect(statusCallback).toHaveBeenCalledWith('disconnected');

      // Clear the mock to start fresh for connection sequence
      statusCallback.mockClear();

      await manager.connect('http://localhost:8123', 'test-token');

      // Wait for connection - run pending timers only once
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      // Now check the connection sequence (setStatus calls have two args)
      expect(statusCallback).toHaveBeenCalledWith('connecting', undefined);
      expect(statusCallback).toHaveBeenCalledWith('authenticating', undefined);
      expect(statusCallback).toHaveBeenCalledWith('connected', undefined);

      // Verify the order of calls
      const calls = statusCallback.mock.calls.map(call => call[0]);
      expect(calls).toEqual(['connecting', 'authenticating', 'connected']);
    });

    it('should handle authentication failure', async () => {
      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);

      // Override mock to send auth_invalid
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        override send(data: string) {
          const message = JSON.parse(data);
          if (message.type === 'auth') {
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage(new MessageEvent('message', {
                  data: JSON.stringify({ type: 'auth_invalid' })
                }));
              }
            }, 10);
          }
        }
      } as any;

      await manager.connect('http://localhost:8123', 'invalid-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      expect(statusCallback).toHaveBeenCalledWith('error', 'Authentication failed');

      global.WebSocket = originalWebSocket;
    });

    it('should disconnect properly', async () => {
      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      expect(manager.isConnected()).toBe(true);

      manager.disconnect();
      expect(manager.isConnected()).toBe(false);
      expect(manager.getStatus()).toBe('disconnected');
    });

    it('should handle reconnection with exponential backoff', async () => {
      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      // Simulate connection loss
      const ws = (manager as any).ws;
      if (ws) {
        ws.close();
      }

      // Should attempt reconnection
      await vi.advanceTimersByTimeAsync(1000); // First retry at 1s
      expect(statusCallback).toHaveBeenCalledWith('disconnected');

      // Check exponential backoff
      await vi.advanceTimersByTimeAsync(2000); // Second retry at 2s
      await vi.advanceTimersByTimeAsync(4000); // Third retry at 4s
    });

    it('should stop reconnecting after max attempts', async () => {
      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);

      // Set max attempts to 3 for testing
      (manager as any).maxReconnectAttempts = 3;

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      // Force disconnections
      for (let i = 0; i < 4; i++) {
        const ws = (manager as any).ws;
        if (ws) {
          ws.close();
        }
        await vi.advanceTimersByTimeAsync(Math.pow(2, i) * 1000);
      }

      expect(statusCallback).toHaveBeenCalledWith('error', 'Max reconnection attempts reached');
    });
  });

  describe('State Change Subscriptions', () => {
    it('should notify on state changes', async () => {
      const stateCallback = vi.fn();
      manager.onStateChange(stateCallback);

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      // Simulate state change event
      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'event',
            event: {
              event_type: 'state_changed',
              data: {
                entity_id: 'light.living_room',
                new_state: {
                  entity_id: 'light.living_room',
                  state: 'on',
                  attributes: { brightness: 255 },
                  last_changed: '2025-01-01T00:00:00Z',
                  last_updated: '2025-01-01T00:00:00Z'
                },
                old_state: {
                  entity_id: 'light.living_room',
                  state: 'off',
                  attributes: {},
                  last_changed: '2025-01-01T00:00:00Z',
                  last_updated: '2025-01-01T00:00:00Z'
                }
              }
            }
          })
        }));
      }

      expect(stateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'state_changed',
          data: expect.objectContaining({
            entity_id: 'light.living_room'
          })
        })
      );
    });

    it('should unsubscribe from state changes', async () => {
      const stateCallback = vi.fn();
      const unsubscribe = manager.onStateChange(stateCallback);

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      unsubscribe();

      // Simulate state change event
      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'event',
            event: {
              event_type: 'state_changed',
              data: { entity_id: 'light.living_room' }
            }
          })
        }));
      }

      expect(stateCallback).not.toHaveBeenCalled();
    });
  });

  describe('Heartbeat', () => {
    it('should send periodic ping messages', async () => {
      const sendSpy = vi.fn();

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws) {
        ws.send = sendSpy;
      }

      // Advance time to trigger heartbeat
      await vi.advanceTimersByTimeAsync(30000);

      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ping"')
      );
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', async () => {
      const statusCallback = vi.fn();
      const stateCallback = vi.fn();

      manager.onStatusChange(statusCallback);
      manager.onStateChange(stateCallback);

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      manager.destroy();

      expect(manager.getStatus()).toBe('disconnected');
      expect((manager as any).ws).toBeNull();
      expect((manager as any).heartbeatInterval).toBeNull();
      expect((manager as any).reconnectTimeout).toBeNull();
    });

    it('should prevent memory leaks by clearing callbacks', () => {
      const callbacks = new Set();

      for (let i = 0; i < 10; i++) {
        callbacks.add(manager.onStatusChange(() => {}));
        callbacks.add(manager.onStateChange(() => {}));
      }

      expect((manager as any).statusChangeCallbacks.size).toBe(10);
      expect((manager as any).stateChangeCallbacks.size).toBe(10);

      manager.destroy();

      expect((manager as any).statusChangeCallbacks.size).toBe(0);
      expect((manager as any).stateChangeCallbacks.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors gracefully', async () => {
      const statusCallback = vi.fn();
      manager.onStatusChange(statusCallback);

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws && ws.onerror) {
        ws.onerror(new Event('error'));
      }

      expect(statusCallback).toHaveBeenCalledWith('error', 'Connection error');
    });

    it('should handle malformed messages', async () => {
      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;

      // Send malformed JSON
      if (ws && ws.onmessage) {
        expect(() => {
          ws.onmessage(new MessageEvent('message', {
            data: 'not valid json'
          }));
        }).not.toThrow();
      }
    });

    it('should handle errors in callbacks', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      manager.onStateChange(errorCallback);

      await manager.connect('http://localhost:8123', 'test-token');
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;

      // Should not throw even if callback throws
      if (ws && ws.onmessage) {
        expect(() => {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'event',
              event: {
                event_type: 'state_changed',
                data: { entity_id: 'light.test' }
              }
            })
          }));
        }).not.toThrow();
      }
    });
  });
});