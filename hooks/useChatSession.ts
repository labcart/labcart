'use client';

/**
 * useChatSession Hook
 *
 * Handles all chat logic for IDE mode:
 * - Socket event handling (bot-message, bot-chunk, error)
 * - Session management (ourSessionId + cliSessionId)
 * - Message status tracking (sending/sent/failed/streaming)
 * - Streaming support with placeholder messages
 * - Timeout handling with retry capability
 *
 * Ported from Market's useChatSession with adaptations for IDE's
 * tabStore-based message management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket, ISocket } from './useSocket';
import useTabStore from '@/store/tabStore';
import type { Message } from '@/types';

interface UseChatSessionOptions {
  tabId: string;           // Tab ID for store updates
  botId: string;           // instance_slug
  botName: string;
  userId: string;
  workspacePath?: string;
  sessionUuid?: string | null;    // Existing session to resume
}

// Response timeout - how long to wait for bot response before showing error
const RESPONSE_TIMEOUT_MS = 60000; // 60 seconds

// Generate UUID using crypto.getRandomValues (works on HTTP, unlike crypto.randomUUID)
function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function useChatSession({
  tabId,
  botId,
  botName,
  userId,
  workspacePath,
  sessionUuid: initialSessionUuid,
}: UseChatSessionOptions) {
  const socket = useSocket();

  // Get store actions
  const {
    addMessageToTab,
    setTabLoading,
    setTabSessionUuid,
    updateTabMessages,
  } = useTabStore();

  // Local state
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');

  // Refs for session tracking
  const ourSessionIdRef = useRef<string | null>(null);
  const claudeSessionUuidRef = useRef<string | null>(initialSessionUuid || null);

  // Refs for message tracking
  const pendingMessageRef = useRef<{ text: string; id: string } | null>(null);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  // Get or create OUR session ID
  const getOrCreateSessionId = useCallback(() => {
    if (ourSessionIdRef.current) {
      return ourSessionIdRef.current;
    }
    const newId = generateUUID();
    ourSessionIdRef.current = newId;
    console.log(`🆕 [${botId}] Created new session ID:`, newId.substring(0, 8));
    return newId;
  }, [botId]);

  // Clear response timeout
  const clearResponseTimeout = useCallback(() => {
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
  }, []);

  // Handle message timeout
  const handleResponseTimeout = useCallback(() => {
    console.error(`⏱️ [${botId}] Response timeout - no response received`);
    setLoading(false);
    setTabLoading(tabId, false);
    setError('Response timed out. The bot may be busy or unavailable.');
    setStreamingText('');
    streamingMessageIdRef.current = null;
  }, [botId, tabId, setTabLoading]);

  // Track connection state
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log(`🔌 [${botId}] Socket connected`);
      setConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      console.log(`🔌 [${botId}] Socket disconnected`);
      setConnected(false);

      if (loading) {
        console.log(`⚠️ [${botId}] Connection lost while waiting for response`);
        setLoading(false);
        setTabLoading(tabId, false);
        setError('Connection lost. Please try again.');
        clearResponseTimeout();
        setStreamingText('');
        streamingMessageIdRef.current = null;
      }
    };

    const handleError = (err: any) => {
      console.error(`❌ [${botId}] Socket error:`, err);
      setError(err?.message || 'Connection error occurred');
      setLoading(false);
      setTabLoading(tabId, false);
      clearResponseTimeout();
    };

    setConnected(socket.connected);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
    };
  }, [socket, botId, tabId, loading, setTabLoading, clearResponseTimeout]);

  // Listen for bot messages
  useEffect(() => {
    if (!socket) return;

    const handleBotMessage = (data: {
      botId: string;
      userId: string;
      message: string;
      sessionUuid?: string;
      timestamp: number;
    }) => {
      // Filter for this bot only
      if (data.botId !== botId) return;

      console.log(`📨 [${botId}] Received bot-message`);

      // Clear timeout
      clearResponseTimeout();

      // Store session UUID
      if (data.sessionUuid) {
        claudeSessionUuidRef.current = data.sessionUuid;
        setTabSessionUuid(tabId, data.sessionUuid);
      }

      // Create final message
      const botMessage: Message = {
        id: streamingMessageIdRef.current || `bot-${Date.now()}`,
        text: data.message,
        sender: 'bot',
        timestamp: data.timestamp,
        role: 'assistant',
        status: 'sent',
      };

      // If we were streaming, replace the streaming message
      // Otherwise add as new message
      if (streamingMessageIdRef.current) {
        // Get current messages and replace streaming one
        const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
        if (tab && tab.type === 'chat') {
          const updatedMessages = tab.messages.map(msg =>
            msg.id === streamingMessageIdRef.current
              ? botMessage
              : msg
          );
          updateTabMessages(tabId, updatedMessages);
        }
      } else {
        addMessageToTab(tabId, botMessage);
      }

      // Reset state
      setLoading(false);
      setTabLoading(tabId, false);
      setError(null);
      setStreamingText('');
      streamingMessageIdRef.current = null;
      pendingMessageRef.current = null;
    };

    const handleBotChunk = (data: {
      botId: string;
      userId: string;
      chunk: string;
      timestamp: number;
    }) => {
      // Filter for this bot only
      if (data.botId !== botId) return;

      // Reset timeout on each chunk
      clearResponseTimeout();
      responseTimeoutRef.current = setTimeout(handleResponseTimeout, RESPONSE_TIMEOUT_MS);

      // Append chunk to streaming text
      setStreamingText(prev => prev + data.chunk);

      // Update the streaming message in the tab
      if (streamingMessageIdRef.current) {
        const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
        if (tab && tab.type === 'chat') {
          const updatedMessages = tab.messages.map(msg =>
            msg.id === streamingMessageIdRef.current
              ? { ...msg, text: msg.text + data.chunk }
              : msg
          );
          updateTabMessages(tabId, updatedMessages);
        }
      }
    };

    const handleServerError = (data: { message: string }) => {
      console.error(`❌ [${botId}] Server error:`, data.message);
      clearResponseTimeout();
      setLoading(false);
      setTabLoading(tabId, false);
      setError(data.message || 'An error occurred');
      setStreamingText('');
      streamingMessageIdRef.current = null;
    };

    socket.on('bot-message', handleBotMessage);
    socket.on('bot-chunk', handleBotChunk);
    socket.on('error', handleServerError);

    return () => {
      socket.off('bot-message', handleBotMessage);
      socket.off('bot-chunk', handleBotChunk);
      socket.off('error', handleServerError);
    };
  }, [
    socket,
    botId,
    tabId,
    clearResponseTimeout,
    handleResponseTimeout,
    addMessageToTab,
    updateTabMessages,
    setTabLoading,
    setTabSessionUuid,
  ]);

  // Send message
  const sendMessage = useCallback((text: string) => {
    if (!socket || !connected || loading || !text.trim()) {
      console.log(`⚠️ [${botId}] Cannot send:`, { hasSocket: !!socket, connected, loading });
      return;
    }

    // Clear any previous error
    setError(null);

    // Get or create session ID
    const ourSessionId = getOrCreateSessionId();

    // Create user message
    const messageId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: messageId,
      text: text.trim(),
      sender: 'user',
      timestamp: Date.now(),
      role: 'user',
      status: 'sending',
    };

    // Track pending message
    pendingMessageRef.current = { text: text.trim(), id: messageId };

    // Create streaming placeholder
    const streamingId = `assistant-${Date.now()}`;
    streamingMessageIdRef.current = streamingId;
    const streamingPlaceholder: Message = {
      id: streamingId,
      text: '',
      sender: 'bot',
      timestamp: Date.now(),
      role: 'assistant',
      status: 'streaming',
    };

    // Add both messages to tab
    addMessageToTab(tabId, userMessage);
    addMessageToTab(tabId, streamingPlaceholder);

    // Update state
    setLoading(true);
    setTabLoading(tabId, true);
    setStreamingText('');

    // Set response timeout
    clearResponseTimeout();
    responseTimeoutRef.current = setTimeout(handleResponseTimeout, RESPONSE_TIMEOUT_MS);

    // Send to bot server with sessionUuid for resume
    console.log(`📤 [${botId}] Sending message with sessionUuid:`, claudeSessionUuidRef.current?.substring(0, 8) || 'new');
    socket.emit('send-message', {
      botId,
      userId,
      message: text.trim(),
      workspacePath,
      sessionUuid: claudeSessionUuidRef.current || ourSessionId,
    });
  }, [
    socket,
    connected,
    loading,
    botId,
    userId,
    workspacePath,
    tabId,
    getOrCreateSessionId,
    addMessageToTab,
    setTabLoading,
    clearResponseTimeout,
    handleResponseTimeout,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearResponseTimeout();
    };
  }, [clearResponseTimeout]);

  return {
    connected,
    loading,
    error,
    streamingText,
    sendMessage,
    clearError: () => setError(null),
  };
}
