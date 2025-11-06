'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BotMessageEvent } from '@/types';

export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to bot server
    const newSocket = io('http://localhost:3010', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Connected to bot server');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from bot server');
    });

    newSocket.on('bot-thinking', (data) => {
      console.log('⏳ Bot is thinking...', data);
    });

    newSocket.on('bot-message', (data: BotMessageEvent) => {
      console.log('📨 Received bot message:', data);
    });

    newSocket.on('message-sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}
