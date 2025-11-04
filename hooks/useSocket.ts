'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface BotMessage {
  botId: string;
  userId: number;
  message: string;
  sessionUuid?: string;  // Session UUID from backend
  hasAudio: boolean;
  hasImages: boolean;
  audioPath?: string;
  imagePath?: string;
  timestamp: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  sendMessage: (botId: string, userId: number, message: string) => void;
  onBotMessage: (callback: (data: BotMessage) => void) => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const messageCallbackRef = useRef<((data: BotMessage) => void) | null>(null);

  useEffect(() => {
    // Connect to bot server
    const socket = io('http://localhost:3010', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Connected to bot server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from bot server');
      setConnected(false);
    });

    socket.on('bot-thinking', (data) => {
      console.log('⏳ Bot is thinking...', data);
      // UI can show a thinking indicator here if needed
    });

    socket.on('bot-message', (data: BotMessage) => {
      console.log('📨 Received bot message:', data);
      if (messageCallbackRef.current) {
        messageCallbackRef.current(data);
      }
    });

    socket.on('message-sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = (botId: string, userId: number, message: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', { botId, userId, message });
    } else {
      console.error('Socket not connected');
    }
  };

  const onBotMessage = (callback: (data: BotMessage) => void) => {
    messageCallbackRef.current = callback;
  };

  return {
    socket: socketRef.current,
    connected,
    sendMessage,
    onBotMessage,
  };
}
