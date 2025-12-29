'use client';

/**
 * WorkspacePanel Component
 *
 * Tab container that manages mixed tabs (chat and file) and renders
 * the appropriate panel component based on active tab type.
 *
 * Responsibilities:
 * - Tab bar rendering
 * - User ID initialization
 * - Workspace state sync
 * - Conditionally render ChatPanel or FilePanel
 */

import { useState, useEffect } from 'react';
import useTabStore from '@/store/tabStore';
import useWorkspaceStore from '@/store/workspaceStore';
import { MessageSquare, X, File } from 'lucide-react';
import type { ChatTab, FileTab } from '@/types';
import { supabase } from '@/lib/supabase';
import ChatPanel from './ChatPanel';
import FilePanel from './FilePanel';

export default function WorkspacePanel() {
  // ========================================================================
  // State Management
  // ========================================================================

  const {
    tabs,
    activeTabId,
    userId,
    setActiveTab,
    removeTab,
    setUserId,
    getActiveTab,
    loadWorkspaceState,
    saveWorkspaceState,
  } = useTabStore();

  const { workspacePath, workspaceId } = useWorkspaceStore();

  const [mounted, setMounted] = useState(false);

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
  // User ID Initialization - Use Supabase User UUID
  // ========================================================================

  useEffect(() => {
    const initializeUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const userUuid = session.user.id;

        // Check if user has changed
        const previousUserId = localStorage.getItem('labcart-user-id');
        if (previousUserId && previousUserId !== userUuid) {
          console.log(`🔄 User changed, clearing workspace state`);
          useTabStore.getState().tabs = [];
          useTabStore.getState().activeTabId = null;
          useTabStore.getState().botServerUrl = 'http://localhost:3010';
          useWorkspaceStore.setState({ isFirstRun: true, workspacePath: '', workspaceId: null });
        }

        console.log(`🔐 User ID from Supabase: ${userUuid}`);
        setUserId(userUuid);
        localStorage.setItem('labcart-user-id', userUuid);
      } else {
        console.warn('⚠️  No Supabase session found, falling back to localStorage');
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
    if (workspaceId && userId) {
      console.log('📂 Loading workspace state for:', workspaceId);
      loadWorkspaceState(workspaceId);
    }
  }, [workspaceId, userId, loadWorkspaceState]);

  // ========================================================================
  // Auto-Save Workspace State to Supabase on Tab Changes
  // ========================================================================

  useEffect(() => {
    if (workspaceId && userId && tabs.length > 0) {
      const timeoutId = setTimeout(() => {
        console.log('💾 Auto-saving workspace state...');
        saveWorkspaceState(workspaceId);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [tabs, activeTabId, workspaceId, userId, saveWorkspaceState]);

  // ========================================================================
  // Tab Management
  // ========================================================================

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  // ========================================================================
  // Tab Rendering Helpers
  // ========================================================================

  const renderTabIcon = (tab: ChatTab | FileTab) => {
    if (tab.type === 'chat') {
      return <MessageSquare size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />;
    } else {
      return <File size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />;
    }
  };

  const renderTabLabel = (tab: ChatTab | FileTab) => {
    if (tab.type === 'chat') {
      return `${tab.botName}${tab.sessionUuid ? ` (${tab.sessionUuid.substring(0, 6)})` : ' (New)'}`;
    } else {
      return tab.fileName || 'Untitled';
    }
  };

  // ========================================================================
  // Get Active Tab
  // ========================================================================

  const activeTab = getActiveTab();

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

      {/* Content Area */}
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
        <ChatPanel
          tab={activeTab}
          userId={userId || ''}
          workspacePath={workspacePath}
        />
      ) : (
        <FilePanel
          tab={activeTab}
          userId={userId || ''}
          workspacePath={workspacePath}
        />
      )}
    </div>
  );
}
