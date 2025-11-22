'use client';

/**
 * WorkspacePanel Component
 *
 * Unified workspace panel that handles both chat tabs and file tabs.
 * Renders tab bar with mixed tab types and conditionally renders content based on active tab type.
 */

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import useTabStore from '@/store/tabStore';
import useWorkspaceStore from '@/store/workspaceStore';
import { api } from '@/services/api';
import { MessageSquare, History, Plus, X, File } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { Message, ChatTab, FileTab } from '@/types';
import { getActiveTheme } from '@/config/themes';
import { supabase } from '@/lib/supabase';

export default function WorkspacePanel() {
  // Get active theme
  const theme = getActiveTheme();
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
    loadWorkspaceState,
    saveWorkspaceState,
  } = useTabStore();

  const { workspacePath, workspaceId } = useWorkspaceStore();

  const [inputValue, setInputValue] = useState('');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messageQueue, setMessageQueue] = useState<Array<{botId: string, userId: string, text: string}>>([]);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [connected, setConnected] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set()); // Track unsaved changes
  const [savedContent, setSavedContent] = useState<Record<string, string>>({}); // Track last saved content
  const [savingFile, setSavingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const socket = useSocket();

  // Detect platform for keyboard shortcut display
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const closeShortcut = isMac ? '⌘W' : 'Ctrl+W';

  // ========================================================================
  // Client-Side Mounting
  // ========================================================================

  useEffect(() => {
    setMounted(true);
  }, []);

  // ========================================================================
  // Keyboard Shortcuts (Ctrl+S / Cmd+S for Save)
  // ========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S - Save file
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's default save behavior

        const activeTab = getActiveTab();
        if (activeTab?.type === 'file' && dirtyFiles.has(activeTab.filePath)) {
          console.log('💾 Saving file via keyboard shortcut...');
          saveFile(activeTab.filePath, fileContent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fileContent, dirtyFiles, getActiveTab]);

  // ========================================================================
  // Socket Connection State Tracking
  // ========================================================================

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    setConnected(socket.connected);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // ========================================================================
  // Connection Monitoring & Message Queue Processing
  // ========================================================================

  useEffect(() => {
    if (connected) {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setConnectionTimeout(false);

      if (messageQueue.length > 0 && socket) {
        console.log(`📤 Processing ${messageQueue.length} queued messages...`);
        messageQueue.forEach(msg => {
          socket.emit('send-message', { botId: msg.botId, userId: msg.userId, message: msg.text, workspacePath });
        });
        setMessageQueue([]);
      }
    } else {
      if (!connectionTimeoutRef.current) {
        connectionTimeoutRef.current = setTimeout(() => {
          const currentTab = getActiveTab();
          if (!connected && currentTab && currentTab.type === 'chat') {
            console.error('⏱️ Connection timeout after 10 seconds');
            setConnectionTimeout(true);

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
  }, [connected, messageQueue, socket, getActiveTab, addMessageToTab]);

  // ========================================================================
  // User ID Initialization - Use Supabase User UUID
  // ========================================================================

  useEffect(() => {
    const initializeUserId = async () => {
      // Get Supabase session to extract user ID
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        // Use the raw UUID string (no hashing) to match bot server USER_ID
        const userUuid = session.user.id;

        console.log(`🔐 User ID from Supabase: ${userUuid}`);
        setUserId(userUuid);
        localStorage.setItem('labcart-user-id', userUuid);
      } else {
        console.warn('⚠️  No Supabase session found, falling back to localStorage');
        // Fallback: check localStorage
        const storedId = localStorage.getItem('labcart-user-id');
        if (storedId) {
          setUserId(storedId);
        }
      }
    };

    initializeUserId();
  }, [setUserId]);

  // ========================================================================
  // Load Workspace State from Supabase on Mount
  // ========================================================================

  useEffect(() => {
    // Load workspace state when workspace ID is available
    if (workspaceId && userId) {
      console.log('📂 Loading workspace state for:', workspaceId);
      loadWorkspaceState(workspaceId);
    }
  }, [workspaceId, userId, loadWorkspaceState]);

  // ========================================================================
  // Auto-Save Workspace State to Supabase on Tab Changes
  // ========================================================================

  useEffect(() => {
    // Save workspace state whenever tabs or activeTabId changes
    if (workspaceId && userId && tabs.length > 0) {
      // Debounce to avoid excessive saves
      const timeoutId = setTimeout(() => {
        console.log('💾 Auto-saving workspace state...');
        saveWorkspaceState(workspaceId);
      }, 1000); // Wait 1 second after last change

      return () => clearTimeout(timeoutId);
    }
  }, [tabs, activeTabId, workspaceId, userId, saveWorkspaceState]);

  // ========================================================================
  // WebSocket Message Handler
  // ========================================================================

  useEffect(() => {
    const handleBotMessage = (data: { botId: string; userId: string; message: string; sessionUuid?: string; timestamp: number }) => {
      const targetTab = tabs.find(tab => tab.type === 'chat' && tab.botId === data.botId);

      if (targetTab && targetTab.type === 'chat') {
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: data.message,
          sender: 'bot',
          timestamp: data.timestamp,
          role: 'assistant'
        };

        addMessageToTab(targetTab.id, botMessage);
        setTabLoading(targetTab.id, false);

        if (data.sessionUuid && !targetTab.sessionUuid) {
          console.log(`🔗 Linking tab ${targetTab.id} to session ${data.sessionUuid.substring(0, 8)}...`);
          setTabSessionUuid(targetTab.id, data.sessionUuid);
        }
      }
    };

    if (socket) {
      socket.on('bot-message', handleBotMessage);
      return () => {
        socket.off('bot-message', handleBotMessage);
      };
    }
  }, [socket, tabs, addMessageToTab, setTabLoading, setTabSessionUuid]);

  // ========================================================================
  // Auto-scroll to Bottom (chat only)
  // ========================================================================

  useEffect(() => {
    const activeTab = getActiveTab();
    if (activeTab?.type === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tabs, activeTabId, getActiveTab]);

  // ========================================================================
  // File Loading
  // ========================================================================

  useEffect(() => {
    const activeTab = getActiveTab();
    if (activeTab?.type === 'file') {
      // Check if this is an untitled file (not saved to disk yet)
      if (activeTab.filePath.startsWith('untitled')) {
        // Don't load from backend, just initialize empty
        setFileContent('');
        setLoadingFile(false);
      } else {
        loadFile(activeTab.filePath);
      }
    }
  }, [activeTabId]);

  const loadFile = async (filePath: string) => {
    setLoadingFile(true);
    try {
      const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      setFileContent(data.content);

      // Store the saved content for dirty tracking
      setSavedContent(prev => ({
        ...prev,
        [filePath]: data.content
      }));

      // Clear dirty flag when loading fresh file
      setDirtyFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(filePath);
        return newSet;
      });
    } catch (error) {
      console.error('Error loading file:', error);
      setFileContent('// Error loading file');
    } finally {
      setLoadingFile(false);
    }
  };

  // Save file function
  const saveFile = async (filePath: string, content: string) => {
    setSavingFile(true);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      const response = await apiFetch('/api/files/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath, content }),
      });

      if (!response.ok) {
        throw new Error('Failed to save file');
      }

      // Update saved content
      setSavedContent(prev => ({
        ...prev,
        [filePath]: content
      }));

      // Clear dirty flag
      setDirtyFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(filePath);
        return newSet;
      });

      console.log('✓ File saved:', filePath);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file. See console for details.');
    } finally {
      setSavingFile(false);
    }
  };

  // Handle editor content change
  const handleEditorChange = (value: string | undefined, filePath: string) => {
    if (value === undefined) return;

    setFileContent(value);

    // Mark as dirty if content differs from saved content
    const isDirty = value !== savedContent[filePath];
    setDirtyFiles(prev => {
      const newSet = new Set(prev);
      if (isDirty) {
        newSet.add(filePath);
      } else {
        newSet.delete(filePath);
      }
      return newSet;
    });
  };

  const getLanguage = (filename: string | undefined) => {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'sh': 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

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
  // Session History Management (chat only)
  // ========================================================================

  const handleCreateNewSession = async () => {
    const activeTab = getActiveTab();
    if (!activeTab || activeTab.type !== 'chat' || !userId) return;

    try {
      await api.session.createNewSession({
        botId: activeTab.botId,
        userId: userId
      });

      replaceTabSession(activeTab.botId, activeTab.botName, null, []);
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const toggleSessionHistory = async () => {
    const activeTab = getActiveTab();
    if (!showSessionHistory && activeTab && activeTab.type === 'chat' && userId) {
      setLoadingSessions(true);
      try {
        const response = await api.session.getSessions(activeTab.botId, userId, workspacePath);

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
    const activeTab = getActiveTab();
    if (!activeTab || activeTab.type !== 'chat' || !userId) return;

    try {
      setShowSessionHistory(false);

      await api.session.switchSession({
        botId: activeTab.botId,
        userId: userId,
        sessionUuid: sessionUuid
      });

      const messagesResponse = await api.session.getMessages(sessionUuid);

      if (messagesResponse.messages) {
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
  // Message Sending (chat only)
  // ========================================================================

  const handleSend = () => {
    const activeTab = getActiveTab();
    if (!inputValue.trim() || !activeTab || activeTab.type !== 'chat' || !userId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue,
      sender: 'user',
      timestamp: Date.now(),
      role: 'user'
    };

    addMessageToTab(activeTab.id, userMessage);
    setTabLoading(activeTab.id, true);

    if (connected && socket) {
      socket.emit('send-message', { botId: activeTab.botId, userId, message: inputValue, workspacePath });
    } else {
      console.log('📥 Queuing message (not connected yet)...');
      setMessageQueue(prev => [...prev, {
        botId: activeTab.botId,
        userId: userId,
        text: inputValue
      }]);

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
  // Get Active Tab Data
  // ========================================================================

  const activeTab = getActiveTab();

  // ========================================================================
  // Render Tab Icon
  // ========================================================================

  const renderTabIcon = (tab: ChatTab | FileTab) => {
    if (tab.type === 'chat') {
      return <MessageSquare size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />;
    } else {
      return <File size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />;
    }
  };

  // ========================================================================
  // Render Tab Label
  // ========================================================================

  const renderTabLabel = (tab: ChatTab | FileTab) => {
    if (tab.type === 'chat') {
      return `${tab.botName}${tab.sessionUuid ? ` (${tab.sessionUuid.substring(0, 6)})` : ' (New)'}`;
    } else {
      return tab.fileName || 'Untitled';
    }
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--background)', minWidth: '300px' }}>
      {/* Tab Bar */}
      <div
        className="flex items-center gap-1 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-1 flex-1 overflow-x-auto thin-scrollbar" style={{ minWidth: 0 }}>
          {tabs.length === 0 ? (
            <div className="px-3 py-1.5 text-sm" style={{ color: 'var(--text)', opacity: 0.5 }}>
              Select a bot or file to get started
            </div>
          ) : (
            tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 pl-3 pr-1 py-2 rounded-t text-sm border border-b-0 cursor-pointer hover:bg-black/5 flex-shrink-0 ${
                    isActive ? '' : 'opacity-60'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--background)' : 'transparent',
                    borderColor: isActive ? 'var(--border)' : 'transparent',
                  }}
                >
                  {renderTabIcon(tab)}
                  <span style={{ color: 'var(--text)' }}>
                    {renderTabLabel(tab)}
                  </span>
                  {/* Dirty indicator (dot) for unsaved file tabs */}
                  {tab.type === 'file' && dirtyFiles.has(tab.filePath) && (
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500"
                      title="Unsaved changes"
                      style={{ marginLeft: '4px' }}
                    />
                  )}
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="ml-1 p-1 hover:bg-black/10 rounded transition-colors"
                    style={{ color: 'var(--text)', opacity: 0.5 }}
                    title={`Close ${closeShortcut}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Content Area - Conditional Rendering Based on Active Tab Type */}
      {!mounted ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
          <p className="text-sm">Loading...</p>
        </div>
      ) : !activeTab ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
          <div className="text-center">
            <MessageSquare size={48} className="mx-auto mb-4" style={{ opacity: 0.3 }} />
            <p className="text-lg font-medium">No active tab</p>
            <p className="text-sm mt-2">Select a team member or file to get started</p>
          </div>
        </div>
      ) : activeTab.type === 'chat' ? (
        // ========================================================================
        // CHAT TAB CONTENT
        // ========================================================================
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

              <div className="flex items-center gap-1">
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
                      backgroundColor: showSessionHistory ? 'rgba(0, 0, 0, 0.05)' : 'transparent'
                    }}
                    title="Session History"
                  >
                    <History size={16} />
                  </button>

                  {showSessionHistory && (
                    <div
                      className="absolute right-0 top-full mt-1 w-80 rounded-lg shadow-lg border overflow-hidden z-50"
                      style={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)'
                      }}
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
                            const isCurrentSession = session.uuid === activeTab?.sessionUuid;
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
        // ========================================================================
        // FILE TAB CONTENT
        // ========================================================================
        <div className="flex-1 flex flex-col">
          {/* File Header */}
          <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File size={16} style={{ color: 'var(--text)', opacity: 0.6 }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {activeTab.fileName || 'Untitled'}
                </span>
                {dirtyFiles.has(activeTab.filePath) && (
                  <span className="text-xs" style={{ color: 'var(--text)', opacity: 0.5 }}>
                    • Modified
                  </span>
                )}
              </div>
              {savingFile && (
                <span className="text-xs" style={{ color: 'var(--text)', opacity: 0.5 }}>
                  Saving...
                </span>
              )}
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            {loadingFile ? (
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text)', opacity: 0.5 }}>
                <p className="text-sm">Loading file...</p>
              </div>
            ) : (
              <Editor
                height="100%"
                language={getLanguage(activeTab.fileName)}
                value={fileContent}
                onChange={(value) => handleEditorChange(value, activeTab.filePath)}
                theme={theme.editor.monacoTheme}
                beforeMount={(monaco) => {
                  // Register vs-light with custom selection highlight
                  monaco.editor.defineTheme('vs-light-custom', {
                    base: 'vs',
                    inherit: true, // Inherit all the colored syntax from vs-light
                    rules: [], // Don't override any token colors
                    colors: {
                      'editor.selectionBackground': '#e8e8e6', // Light gray selection
                    },
                  });

                  // Register custom zen grayscale theme
                  monaco.editor.defineTheme('zen-grayscale', {
                    base: 'vs',
                    inherit: true,
                    rules: [
                      // Keywords (if, else, function, const, let, var, etc.)
                      { token: 'keyword', foreground: '4a4745', fontStyle: 'bold' },

                      // Strings
                      { token: 'string', foreground: '5a5855' },

                      // Comments
                      { token: 'comment', foreground: '8a8885', fontStyle: 'italic' },

                      // Numbers
                      { token: 'number', foreground: '6a6865' },

                      // Functions
                      { token: 'identifier.function', foreground: '4a4745' },
                      { token: 'support.function', foreground: '4a4745' },

                      // Types & Classes
                      { token: 'type', foreground: '5a5855' },
                      { token: 'class', foreground: '5a5855' },
                      { token: 'identifier.class', foreground: '5a5855' },

                      // Variables
                      { token: 'variable', foreground: '2c2826' },
                      { token: 'identifier', foreground: '2c2826' },

                      // Operators
                      { token: 'operator', foreground: '6a6865' },
                      { token: 'delimiter', foreground: '7a7875' },

                      // Tags (HTML/JSX)
                      { token: 'tag', foreground: '4a4745' },
                      { token: 'tag.attribute', foreground: '6a6865' },

                      // Constants
                      { token: 'constant', foreground: '5a5855' },

                      // Regular expressions
                      { token: 'regexp', foreground: '7a7875' },

                      // Annotations
                      { token: 'annotation', foreground: '8a8885' },
                      { token: 'meta', foreground: '8a8885' },
                    ],
                    colors: {
                      'editor.background': '#f6f6f5',
                      'editor.foreground': '#2c2826',
                      'editor.lineHighlightBackground': '#fafaf9',
                      'editor.selectionBackground': '#e8e8e6',
                      'editorCursor.foreground': '#2c2826',
                      'editorWhitespace.foreground': '#e0e0e0',
                      'editorLineNumber.foreground': '#9a9895',
                      'editorLineNumber.activeForeground': '#2c2826',
                      'editorIndentGuide.background': '#e0e0e0',
                      'editorIndentGuide.activeBackground': '#9a9895',
                      'editorWidget.background': '#ffffff',
                      'editorWidget.border': '#e0e0e0',
                      'editorSuggestWidget.background': '#ffffff',
                      'editorSuggestWidget.border': '#e0e0e0',
                      'editorSuggestWidget.selectedBackground': '#ecece9',
                      'editorHoverWidget.background': '#ffffff',
                      'editorHoverWidget.border': '#e0e0e0',
                    },
                  });
                }}
                options={{
                  // VS Code default settings
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
                  fontLigatures: true,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                  detectIndentation: true,
                  trimAutoWhitespace: true,

                  // Line highlighting - VS Code uses subtle highlight, not full width
                  renderLineHighlight: 'line', // 'line' = just the line number area, not full width
                  renderLineHighlightOnlyWhenFocus: true,

                  // Scrolling behavior
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',

                  // Bracket matching
                  matchBrackets: 'always',
                  bracketPairColorization: {
                    enabled: true,
                  },

                  // IntelliSense & suggestions
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: 'on',
                  tabCompletion: 'on',
                  wordBasedSuggestions: 'matchingDocuments',

                  // Whitespace & indentation guides
                  renderWhitespace: 'selection',
                  guides: {
                    indentation: true,
                    bracketPairs: true,
                  },

                  // Editor behavior
                  formatOnPaste: true,
                  formatOnType: false,
                  autoClosingBrackets: 'languageDefined',
                  autoClosingQuotes: 'languageDefined',
                  autoSurround: 'languageDefined',

                  // Performance
                  folding: true,
                  foldingStrategy: 'auto',
                  showFoldingControls: 'mouseover',

                  readOnly: false,
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
