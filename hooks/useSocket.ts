'use client';

import { useEffect, useState } from 'react';
import useTabStore from '@/store/tabStore';

// Socket interface that works with both Socket.IO and raw WebSocket
export interface ISocket {
  connected: boolean;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
  disconnect(): void;
}

// Reconnection config
const RECONNECT_BASE_DELAY = 1000;  // Start at 1 second
const RECONNECT_MAX_DELAY = 30000;  // Max 30 seconds
const RECONNECT_MAX_ATTEMPTS = 10;  // Give up after 10 attempts

// Create a Socket-like wrapper for raw WebSocket with reconnection + message queue
class WebSocketWrapper implements ISocket {
  private ws: WebSocket | null = null;
  private url: string;
  private eventHandlers: Map<string, Function[]> = new Map();
  private messageQueue: Array<{ event: string; data?: any }> = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  public connected = false;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        const wasReconnect = this.reconnectAttempts > 0;
        this.connected = true;
        this.reconnectAttempts = 0;

        // Flush queued messages
        this.flushMessageQueue();

        if (wasReconnect) {
          console.log('🔄 WebSocket reconnected');
          this.trigger('reconnect');
        }
        this.trigger('connect');
      };

      this.ws.onclose = (event) => {
        this.connected = false;
        this.trigger('disconnect', { code: event.code, reason: event.reason });

        // Attempt reconnection unless intentionally disconnected
        if (!this.intentionalDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.trigger('error', error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.event && message.data !== undefined) {
            this.trigger(message.event, message.data);
          } else if (message.event) {
            // Handle events with no data
            this.trigger(message.event);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.intentionalDisconnect) return;
    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      console.error(`❌ WebSocket: Max reconnection attempts (${RECONNECT_MAX_ATTEMPTS}) reached`);
      this.trigger('reconnect_failed');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ... up to max
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );

    this.reconnectAttempts++;
    console.log(`🔄 WebSocket: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS})`);

    this.reconnectTimer = setTimeout(() => {
      this.trigger('reconnecting', { attempt: this.reconnectAttempts });
      this.connect();
    }, delay);
  }

  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Flushing ${this.messageQueue.length} queued messages`);
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const msg of queue) {
      this.emit(msg.event, msg.data);
    }
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Emit sends data to the server - queues if not connected
  emit(event: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push({ event, data });
      console.log(`📥 Queued message (${this.messageQueue.length} pending): ${event}`);
    }
  }

  // Internal method to trigger local event handlers
  private trigger(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  disconnect() {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export function useSocket(): WebSocketWrapper | null {
  const [socket, setSocket] = useState<WebSocketWrapper | null>(null);
  const userId = useTabStore((state) => state.userId);

  useEffect(() => {
    if (!userId) {
      console.log('⏸️ Waiting for userId before connecting');
      return;
    }

    // Connect to WebSocket proxy using raw WebSocket
    const proxyUrl = `wss://ide-ws.labcart.io?userId=${encodeURIComponent(userId)}&type=client`;
    console.log(`🔌 Connecting to IDE WebSocket proxy: ${proxyUrl}`);

    const newSocket = new WebSocketWrapper(proxyUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Connected to bot server');
    });

    newSocket.on('disconnect', (data: any) => {
      console.log('🔌 Disconnected from bot server', data?.reason || '');
    });

    newSocket.on('reconnecting', (data: any) => {
      console.log(`🔄 Attempting to reconnect (attempt ${data?.attempt})...`);
    });

    newSocket.on('reconnect', () => {
      console.log('🔄 Successfully reconnected to bot server');
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after max attempts');
    });

    newSocket.on('bot-thinking', (data: any) => {
      console.log('⏳ Bot is thinking...', data);
    });

    newSocket.on('bot-message', (data: any) => {
      console.log('📨 Received bot message:', data);
    });

    newSocket.on('message-sent', (data: any) => {
      console.log('✅ Message sent confirmation:', data);
    });

    newSocket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [userId]); // Reconnect if userId changes

  return socket;
}
