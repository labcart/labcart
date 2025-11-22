'use client';

import { useEffect, useState } from 'react';
import useTabStore from '@/store/tabStore';

// Create a Socket-like wrapper for raw WebSocket
class WebSocketWrapper {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  public connected = false;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this.trigger('connect');
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.trigger('disconnect');
    };

    this.ws.onerror = (error) => {
      this.trigger('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event && message.data) {
          this.trigger(message.event, message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
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

  // Emit sends data to the server (like Socket.IO)
  emit(event: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
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

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from bot server');
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
