'use client';

/**
 * ChatWindow Component
 *
 * Professional multi-tab chat interface using Zustand for state management.
 * Handles tab rendering, message display, and WebSocket integration.
 */

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import useTabStore from '@/store/tabStore';
import { api } from '@/services/api';
import { MessageSquare, History, Plus, X } from 'lucide-react';
import type { Message } from '@/types';

export default function ChatWindow() {
  // ========================================================================
  // State Management
  // ========================================================================

  const {
    tabs,
    activeTabId,
    userId,
    setActiveTab,
    removeTab,
    addTab,
    addMessageToTab,
    updateTabMessages,
    setTabLoading,
    setTabSessionUuid,
    replaceTabSession,
    setUserId,
    getActiveTab,
  } = useTabStore();

  const [inputValue, setInputValue] = useState('');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [mounted, setMounted] = useState(false); // Prevent hydration mismatch
  const [messageQueue, setMessageQueue] = useState<Array<{botId: string, userId: number, text: string}>>([]);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { connected, sendMessage: sendSocketMessage, onBotMessage } = useSocket();

  // ========================================================================
  // Client-Side Mounting (Prevent Hydration Mismatch)
  // ========================================================================

  useEffect(() => {
    setMounted(true);
  }, []);

  // ========================================================================
  // Connection Monitoring & Message Queue Processing
  // ========================================================================

  useEffect(() => {
    if (connected) {
      // Clear connection timeout if it exists
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setConnectionTimeout(false);

      // Process any queued messages
      if (messageQueue.length > 0) {
        console.log(`📤 Processing ${messageQueue.length} queued messages...`);
        messageQueue.forEach(msg => {
          sendSocketMessage(msg.botId, msg.userId, msg.text);
        });
        setMessageQueue([]);
      }
    } else {
      // Start connection timeout (10 seconds)
      if (!connectionTimeoutRef.current) {
        connectionTimeoutRef.current = setTimeout(() => {
          const currentTab = getActiveTab();
          if (!connected && currentTab) {
            console.error('⏱️ Connection timeout after 10 seconds');
            setConnectionTimeout(true);

            // Add error message to active tab
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              text: 'Unable to connect to bot server. Please check your connection and try again.',
              sender: 'bot',
              timestamp: Date.now(),
              role: 'assistant'
            };
            addMessageToTab(currentTab.id, errorMessage);
          }
        }, 10000);
      }
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [connected, messageQueue, sendSocketMessage, getActiveTab, addMessageToTab]);

  // ========================================================================
  // User ID Initialization
  // ========================================================================

  useEffect(() => {
    let id = localStorage.getItem('labcart-user-id');
    if (!id) {
      id = String(Math.floor(Math.random() * 1000000000));
      localStorage.setItem('labcart-user-id', id);
    }
    setUserId(parseInt(id));
  }, [setUserId]);

  // ========================================================================
  // WebSocket Message Handler
  // ========================================================================

  useEffect(() => {
    const handleBotMessage = (data: { botId: string; userId: number; message: string; sessionUuid?: string; timestamp: number }) => {
      // Find the tab for this bot+user and add the message
      const targetTab = tabs.find(tab => tab.botId === data.botId);

      if (targetTab) {
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: data.message,
          sender: 'bot',
          timestamp: data.timestamp,
          role: 'assistant'
        };

        addMessageToTab(targetTab.id, botMessage);
        setTabLoading(targetTab.id, false);

        // Update tab's sessionUuid if backend provided one (first message response)
        if (data.sessionUuid && !targetTab.sessionUuid) {
          console.log(`🔗 Linking tab ${targetTab.id} to session ${data.sessionUuid.substring(0, 8)}...`);
          setTabSessionUuid(targetTab.id, data.sessionUuid);
        }
      }
    };

    onBotMessage(handleBotMessage);
  }, [tabs, addMessageToTab, setTabLoading, setTabSessionUuid, onBotMessage]);

  // ========================================================================
  // Auto-scroll to Bottom
  // ========================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tabs, activeTabId]);

  // ========================================================================
  // Click Outside Handler for Session Dropdown
  // ========================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sessionDropdownRef.current && !sessionDropdownRef.current.contains(event.target as Node)) {
        setShowSessionHistory(false);
      }
    };

    if (showSessionHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSessionHistory]);

  // ========================================================================
  // Session History Management
  // ========================================================================

  const handleCreateNewSession = async () => {
    if (!activeTab || !userId) return;

    try {
      // Call backend to archive current session
      await api.session.createNewSession({
        botId: activeTab.botId,
        userId: userId
      });

      // Replace tab with fresh session
      replaceTabSession(activeTab.botId, activeTab.botName, null, []);
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const toggleSessionHistory = async () => {
    if (!showSessionHistory && activeTab && userId) {
      // Opening history - fetch sessions for THIS bot+user combo (same as Telegram)
      setLoadingSessions(true);
      try {
        const response = await api.session.getSessions(activeTab.botId, userId);

        // Combine current session + history (same structure as Telegram)
        const allSessions = [
          ...(response.currentSession ? [response.currentSession] : []),
          ...response.history
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
    if (!activeTab || !userId) return;

    try {
      // Close the dropdown
      setShowSessionHistory(false);

      // CRITICAL: Tell backend to switch to this session
      // This updates backend metadata so currentUuid matches frontend
      await api.session.switchSession({
        botId: activeTab.botId,
        userId: userId,
        sessionUuid: sessionUuid
      });

      // Load messages from the selected session
      const messagesResponse = await api.session.getMessages(sessionUuid);

      if (messagesResponse.messages) {
        // Replace the bot's existing tab with this session (enforces one tab per bot)
        replaceTabSession(
          activeTab.botId,
          activeTab.botName,
          sessionUuid,
          messagesResponse.messages
        );
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // ========================================================================
  // Message Sending
  // ========================================================================

  const handleSend = () => {
    const activeTab = getActiveTab();
    if (!inputValue.trim() || !activeTab || !userId) return;

    // Add user message to tab
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue,
      sender: 'user',
      timestamp: Date.now(),
      role: 'user'
    };

    addMessageToTab(activeTab.id, userMessage);
    setTabLoading(activeTab.id, true);

    // If connected, send immediately. Otherwise, queue it.
    if (connected) {
      sendSocketMessage(activeTab.botId, userId, inputValue);
    } else {
      console.log('📥 Queuing message (not connected yet)...');
      setMessageQueue(prev => [...prev, {
        botId: activeTab.botId,
        userId: userId,
        text: inputValue
      }]);

      // Show a system message to user
      const queueMessage: Message = {
        id: `queue-${Date.now()}`,
        text: 'Message queued. Will send when connected to bot server...',
        sender: 'bot',
        timestamp: Date.now(),
        role: 'assistant'
      };
      setTimeout(() => {
        addMessageToTab(activeTab.id, queueMessage);
      }, 100);
    }

    // Clear input
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ========================================================================
  // Tab Management
  // ========================================================================

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  // ========================================================================
  // Get Active Tab Data (reactive - updates when tabs or activeTabId changes)
  // ========================================================================

  const activeTab = tabs.find(t => t.id === activeTabId) || null;

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="flex-1 h-full flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* Tab Bar */}
      <div
        className="flex items-center gap-1 py-1 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
      >
        {/* Tabs on the left */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {tabs.length === 0 ? (
            <div className="px-3 py-1.5 text-sm" style={{ color: 'var(--text)', opacity: 0.5 }}>
              Select a bot from the team sidebar to start chatting
            </div>
          ) : (
            tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-sm border border-b-0 cursor-pointer hover:bg-black/5 ${
                    isActive ? '' : 'opacity-60'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--background)' : 'transparent',
                    borderColor: isActive ? 'var(--border)' : 'transparent',
                  }}
                >
                  <MessageSquare size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
                  <span style={{ color: 'var(--text)' }}>
                    {tab.botName}
                    {tab.sessionUuid ? ` (${tab.sessionUuid.substring(0, 6)})` : ' (New)'}
                  </span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="text-xs hover:bg-black/10 rounded px-1"
                    style={{ color: 'var(--text)', opacity: 0.5 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Content */}
      {!mounted ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
          <div className="text-center">
            <MessageSquare size={48} className="mx-auto mb-4" style={{ opacity: 0.3 }} />
            <p className="text-sm">Loading...</p>
          </div>
        </div>
      ) : activeTab ? (
        <>
          {/* Header */}
          <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} style={{ color: 'var(--text)', opacity: 0.6 }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Chatting with: {activeTab.botName}
                </span>
              </div>

              {/* Right side buttons */}
              <div className="flex items-center gap-1">
                {/* New Session Button */}
                <button
                  onClick={handleCreateNewSession}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5"
                  style={{ color: 'var(--text)' }}
                  title="New Session"
                >
                  <Plus size={16} />
                </button>

                {/* Session History Button */}
                <div className="relative" ref={sessionDropdownRef}>
                  <button
                    onClick={toggleSessionHistory}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5"
                    style={{
                      color: 'var(--text)',
                      backgroundColor: showSessionHistory ? 'rgba(0, 0, 0, 0.05)' : 'transparent'
                    }}
                    title="Session History"
                  >
                    <History size={16} />
                  </button>

                {/* Session History Dropdown */}
                {showSessionHistory && (
                  <div
                    className="absolute right-0 top-full mt-1 w-80 rounded-lg shadow-lg border overflow-hidden z-50"
                    style={{
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    {/* Sessions List */}
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
                        sessions.map((session, index) => {
                          const isCurrentSession = session.uuid === activeTab?.sessionUuid;
                          // Use updatedAt, createdAt, or endedAt (for archived sessions)
                          const timestamp = session.updatedAt || session.createdAt || session.endedAt;
                          let formattedDate = 'No date';

                          // Debug logging
                          if (index < 3) {
                            console.log(`Session ${index}: uuid=${session.uuid?.substring(0, 8)}, updatedAt=${session.updatedAt}, createdAt=${session.createdAt}, endedAt=${session.endedAt}, final timestamp=${timestamp}`);
                          }

                          if (timestamp) {
                            const sessionDate = new Date(timestamp);
                            // Check if date is valid
                            if (!isNaN(sessionDate.getTime())) {
                              formattedDate = sessionDate.toLocaleDateString('en-US', {
                                timeZone: 'America/New_York',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
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
                                cursor: isCurrentSession ? 'default' : 'pointer'
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
                                          color: 'var(--text)'
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
            {activeTab.messages.length === 0 ? (
              <div className="flex items-center justify-center" style={{ minHeight: '100%' }}>
                <div className="text-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
                  <p className="text-sm">Start a conversation with {activeTab.botName}</p>
                  <p className="text-xs mt-1">
                    {connected ? 'Connected to bot server' : 'Connecting...'}
                  </p>
                </div>
              </div>
            ) : (
              activeTab.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[70%] rounded-lg p-3"
                    style={
                      msg.sender === 'user'
                        ? { backgroundColor: 'var(--sidebar-bg)' }
                        : { backgroundColor: 'white', border: '1px solid var(--border)' }
                    }
                  >
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))
            )}
            {activeTab.isLoading && (
              <div className="flex justify-start">
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>
                      {activeTab.botName} is typing...
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
              />
              <button
                className="px-4 py-2 rounded border text-sm font-medium"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  backgroundColor: 'transparent',
                  opacity: !inputValue.trim() ? 0.5 : 1
                }}
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                Send
              </button>
            </div>
            {!connected && (
              <div className="mt-2 text-xs" style={{ color: 'var(--text)', opacity: 0.6 }}>
                ⚠️ Connecting to bot server... Messages will be queued.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
          <div className="text-center">
            <MessageSquare size={48} className="mx-auto mb-4" style={{ opacity: 0.3 }} />
            <p className="text-lg font-medium">No active chat</p>
            <p className="text-sm mt-2">Select a team member from the right sidebar to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
