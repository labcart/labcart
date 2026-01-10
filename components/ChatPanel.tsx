'use client';

/**
 * ChatPanel Component
 *
 * Renders chat interface for bot conversations with:
 * - Message display with streaming support
 * - Session history dropdown
 * - Input area
 * - Connection status
 *
 * Uses useChatSession hook for all chat logic.
 * Extracted from WorkspacePanel.tsx for better separation of concerns.
 */

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, History, Plus, ExternalLink } from 'lucide-react';
import { useChatSession } from '@/hooks/useChatSession';
import useTabStore from '@/store/tabStore';
import { api } from '@/services/api';
import type { ChatTab, Message } from '@/types';

interface ChatPanelProps {
  tab: ChatTab;
  userId: string;
  workspacePath: string;
}

export default function ChatPanel({ tab, userId, workspacePath }: ChatPanelProps) {
  // Chat session hook
  const {
    connected,
    loading,
    error,
    sendMessage,
    clearError,
  } = useChatSession({
    tabId: tab.id,
    botId: tab.botId,
    botName: tab.botName,
    userId,
    workspacePath,
    sessionUuid: tab.sessionUuid,
  });

  // Store actions
  const { replaceTabSession } = useTabStore();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab.messages]);

  // Click outside handler for session dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sessionDropdownRef.current && !sessionDropdownRef.current.contains(event.target as Node)) {
        setShowSessionHistory(false);
      }
    };

    if (showSessionHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSessionHistory]);

  // Handle send
  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Session management
  const handleCreateNewSession = async () => {
    try {
      await api.session.createNewSession({
        botId: tab.botId,
        userId: userId,
      });
      replaceTabSession(tab.botId, tab.botName, null, []);
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const toggleSessionHistory = async () => {
    if (!showSessionHistory) {
      setLoadingSessions(true);
      try {
        const response = await api.session.getSessions(tab.botId, userId, workspacePath);
        const allSessions = [
          ...(response.currentSession ? [response.currentSession] : []),
          ...response.history,
        ];
        setSessions(allSessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    }
    setShowSessionHistory(!showSessionHistory);
  };

  const handleLoadSession = async (sessionUuid: string) => {
    try {
      setShowSessionHistory(false);

      await api.session.switchSession({
        botId: tab.botId,
        userId: userId,
        sessionUuid: sessionUuid,
      });

      const messagesResponse = await api.session.getMessages(sessionUuid);

      if (messagesResponse.messages) {
        replaceTabSession(tab.botId, tab.botName, sessionUuid, messagesResponse.messages);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // Pop out chat into new window
  const handlePopout = () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const params = new URLSearchParams({
      tabId: tab.id,
      botId: tab.botId,
      botName: tab.botName,
      userId: userId,
      workspacePath: workspacePath,
      ...(tab.sessionUuid && { sessionUuid: tab.sessionUuid }),
    });

    window.open(
      `${basePath}/popout/chat?${params.toString()}`,
      '_blank',
      'width=500,height=700,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  // Render message with status indicator
  const renderMessage = (msg: Message) => {
    const isUser = msg.sender === 'user';
    const isStreaming = msg.status === 'streaming';
    const isFailed = msg.status === 'failed';

    return (
      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className="max-w-[70%] rounded-lg p-3"
          style={
            isUser
              ? { backgroundColor: 'var(--sidebar-bg)' }
              : { backgroundColor: 'white', border: '1px solid var(--border)' }
          }
        >
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
            {msg.text || (isStreaming ? '' : '')}
          </p>
          {isStreaming && !msg.text && (
            <span className="animate-pulse" style={{ color: 'var(--text)', opacity: 0.5 }}>
              ...
            </span>
          )}
          {isFailed && (
            <span className="text-xs text-red-500 mt-1 block">
              Failed to send
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} style={{ color: 'var(--text)', opacity: 0.6 }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Chatting with: {tab.botName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePopout}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5"
              style={{ color: 'var(--text)' }}
              title="Pop Out Chat"
            >
              <ExternalLink size={16} />
            </button>
            <button
              onClick={handleCreateNewSession}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5"
              style={{ color: 'var(--text)' }}
              title="New Session"
            >
              <Plus size={16} />
            </button>

            <div className="relative" ref={sessionDropdownRef}>
              <button
                onClick={toggleSessionHistory}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5"
                style={{
                  color: 'var(--text)',
                  backgroundColor: showSessionHistory ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                }}
                title="Session History"
              >
                <History size={16} />
              </button>

              {showSessionHistory && (
                <div
                  className="absolute right-0 top-full mt-1 w-80 rounded-lg shadow-lg border overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                >
                  <div className="max-h-96 overflow-y-auto">
                    {loadingSessions ? (
                      <div className="p-4 text-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
                        <div className="text-sm">Loading sessions...</div>
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="p-4 text-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
                        <div className="text-sm">No session history</div>
                      </div>
                    ) : (
                      sessions.map((session) => {
                        const isCurrentSession = session.uuid === tab.sessionUuid;
                        const timestamp = session.updatedAt || session.createdAt || session.endedAt;
                        let formattedDate = 'No date';

                        if (timestamp) {
                          const sessionDate = new Date(timestamp);
                          if (!isNaN(sessionDate.getTime())) {
                            formattedDate = sessionDate.toLocaleDateString('en-US', {
                              timeZone: 'America/New_York',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                          }
                        }

                        return (
                          <div
                            key={session.uuid}
                            onClick={() => !isCurrentSession && handleLoadSession(session.uuid)}
                            className="px-3 py-2 border-b hover:bg-black/5 cursor-pointer"
                            style={{
                              borderColor: 'var(--border)',
                              backgroundColor: isCurrentSession ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                              cursor: isCurrentSession ? 'default' : 'pointer',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                    {session.uuid.substring(0, 8)}...
                                  </span>
                                  {isCurrentSession && (
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: 'rgba(96, 165, 250, 0.2)',
                                        color: 'var(--text)',
                                      }}
                                    >
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: 'var(--text)', opacity: 0.5 }}>
                                  {session.messageCount || 0} messages · {formattedDate}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {tab.messages.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: '100%' }}>
            <div className="text-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
              <p className="text-sm">Start a conversation with {tab.botName}</p>
              <p className="text-xs mt-1">
                {connected ? 'Connected to bot server' : 'Connecting...'}
              </p>
            </div>
          </div>
        ) : (
          tab.messages.map(renderMessage)
        )}

        {/* Error display */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-[80%]">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-500 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator (shown when isLoading but no streaming message yet) */}
        {tab.isLoading && !tab.messages.some(m => m.status === 'streaming') && (
          <div className="flex justify-start">
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <div className="animate-pulse text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>
                  {tab.botName} is typing...
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type message..."
            className="flex-1 px-3 py-2 rounded border text-sm focus:outline-none focus:border-gray-300"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            className="px-4 py-2 rounded border text-sm font-medium"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text)',
              backgroundColor: 'transparent',
              opacity: !inputValue.trim() || loading ? 0.5 : 1,
            }}
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
          >
            Send
          </button>
        </div>
        {!connected && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text)', opacity: 0.6 }}>
            Connecting to bot server... Messages will be queued.
          </div>
        )}
      </div>
    </>
  );
}
