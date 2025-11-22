/**
 * Tab Store (Zustand)
 *
 * Global state management for chat tabs and sessions.
 * Handles tab lifecycle, message routing, and active tab tracking.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TabStore, ChatTab, FileTab, Tab, Message } from '@/types';

const useTabStore = create<TabStore>()(
  devtools(
    persist(
      (set, get) => ({
      // ========================================================================
      // State
      // ========================================================================

      tabs: [],
      activeTabId: null,
      userId: null,
      hasInitialized: false, // Track if we've done first-time initialization
      workspacePath: null, // Track which workspace this state belongs to
      botServerUrl: 'http://localhost:3010', // Default to localhost for dev

      // ========================================================================
      // Actions
      // ========================================================================

      /**
       * Add a new tab for a bot + session
       * If sessionUuid is provided, it's an existing session
       * If not provided, it's a new unsaved session
       */
      addTab: (botId: string, botName: string, sessionUuid?: string) => {
        const tabId = sessionUuid
          ? `${botId}-${sessionUuid}`
          : `${botId}-new-${Date.now()}`;

        // Check if tab already exists
        const existingTab = get().tabs.find((t) => t.id === tabId);
        if (existingTab) {
          set({ activeTabId: tabId });
          return;
        }

        const newTab: ChatTab = {
          type: 'chat',
          id: tabId,
          botId,
          botName,
          sessionUuid: sessionUuid || null,
          messages: [],
          isLoading: false,
          lastActivity: Date.now(),
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: tabId,
        }));
      },

      /**
       * Remove a tab
       */
      removeTab: (tabId: string) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          let newActiveTabId = state.activeTabId;

          // If we're closing the active tab, switch to another tab
          if (state.activeTabId === tabId) {
            if (newTabs.length > 0) {
              // Switch to the tab before the closed one, or the first tab
              const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
              const newIndex = Math.max(0, closedIndex - 1);
              newActiveTabId = newTabs[newIndex]?.id || null;
            } else {
              newActiveTabId = null;
            }
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
          };
        });
      },

      /**
       * Set the active tab
       */
      setActiveTab: (tabId: string) => {
        set({ activeTabId: tabId });
      },

      /**
       * Replace all messages in a chat tab (for loading from backend)
       */
      updateTabMessages: (tabId: string, messages: Message[]) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId && tab.type === 'chat'
              ? { ...tab, messages, lastActivity: Date.now() }
              : tab
          ),
        }));
      },

      /**
       * Add a single message to a chat tab (for real-time updates)
       */
      addMessageToTab: (tabId: string, message: Message) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId && tab.type === 'chat'
              ? {
                  ...tab,
                  messages: [...tab.messages, message],
                  lastActivity: Date.now(),
                }
              : tab
          ),
        }));
      },

      /**
       * Set chat tab loading state
       */
      setTabLoading: (tabId: string, isLoading: boolean) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId && tab.type === 'chat' ? { ...tab, isLoading } : tab
          ),
        }));
      },

      /**
       * Update chat tab's session UUID (when backend creates session)
       */
      setTabSessionUuid: (tabId: string, sessionUuid: string) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId && tab.type === 'chat' ? { ...tab, sessionUuid } : tab
          ),
        }));
      },

      /**
       * Replace a bot's tab with a new session
       * Used for "New Session" and loading old sessions
       * Enforces one tab per bot = current session
       */
      replaceTabSession: (botId: string, botName: string, sessionUuid: string | null, messages: Message[] = []) => {
        set((state) => {
          // Find existing chat tab for this bot
          const existingTab = state.tabs.find((t) => t.type === 'chat' && t.botId === botId) as ChatTab | undefined;

          if (existingTab) {
            // Replace the existing tab's session
            const newTabId = sessionUuid
              ? `${botId}-${sessionUuid}`
              : `${botId}-new-${Date.now()}`;

            return {
              tabs: state.tabs.map((tab) =>
                tab.id === existingTab.id
                  ? {
                      type: 'chat' as const,
                      id: newTabId,
                      botId: existingTab.botId,
                      botName: existingTab.botName,
                      sessionUuid,
                      messages,
                      isLoading: false,
                      lastActivity: Date.now(),
                    }
                  : tab
              ),
              activeTabId: newTabId,
            };
          } else {
            // No existing tab, create new one
            const newTabId = sessionUuid
              ? `${botId}-${sessionUuid}`
              : `${botId}-new-${Date.now()}`;

            const newTab: ChatTab = {
              type: 'chat',
              id: newTabId,
              botId,
              botName,
              sessionUuid,
              messages,
              isLoading: false,
              lastActivity: Date.now(),
            };

            return {
              tabs: [...state.tabs, newTab],
              activeTabId: newTabId,
            };
          }
        });
      },

      /**
       * Add a file tab (or activate if already open)
       */
      addFileTab: (filePath: string) => {
        const fileName = filePath.split('/').pop() || 'Untitled';
        const tabId = `file-${filePath}`;

        // Check if file tab already exists
        const existingTab = get().tabs.find((t) => t.id === tabId);
        if (existingTab) {
          set({ activeTabId: tabId });
          return;
        }

        const newTab: FileTab = {
          type: 'file',
          id: tabId,
          filePath,
          fileName,
          lastActivity: Date.now(),
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: tabId,
        }));
      },

      /**
       * Set user ID (from Supabase auth on app init)
       */
      setUserId: (userId: string) => {
        set({ userId });
      },

      /**
       * Initialize default tab if no tabs exist
       * Call this once on app mount
       */
      initializeDefaultTab: () => {
        const state = get();

        // Only run once and only if no tabs exist
        if (state.hasInitialized || state.tabs.length > 0) {
          return;
        }

        // Create default untitled file tab
        const defaultTab: FileTab = {
          type: 'file',
          id: 'file-untitled-1',
          filePath: 'untitled-1',
          fileName: 'Untitled-1',
          lastActivity: Date.now(),
        };

        set({
          tabs: [defaultTab],
          activeTabId: defaultTab.id,
          hasInitialized: true,
        });

        console.log('✓ Created default untitled file tab');
      },

      /**
       * Get the currently active tab
       */
      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.id === state.activeTabId) || null;
      },

      /**
       * Validate persisted tabs against backend on app mount
       * Removes tabs for sessions that no longer exist
       * Call this from app mount useEffect
       */
      validateTabs: async () => {
        const state = get();

        // Skip if no userId or no tabs
        if (!state.userId || state.tabs.length === 0) {
          return;
        }

        try {
          // Import api here to avoid circular dependency
          const { api } = await import('@/services/api');

          // Group chat tabs by botId to minimize API calls (skip file tabs)
          const tabsByBot = new Map<string, ChatTab[]>();
          for (const tab of state.tabs) {
            if (tab.type === 'chat') {
              if (!tabsByBot.has(tab.botId)) {
                tabsByBot.set(tab.botId, []);
              }
              tabsByBot.get(tab.botId)!.push(tab);
            }
          }

          const validTabIds = new Set<string>();

          // All file tabs are always valid (no backend validation needed)
          for (const tab of state.tabs) {
            if (tab.type === 'file') {
              validTabIds.add(tab.id);
            }
          }

          // Check each bot's sessions
          for (const [botId, botTabs] of tabsByBot.entries()) {
            try {
              const sessionsResponse = await api.session.getSessions(botId, state.userId, state.workspacePath || undefined);

              // Collect all valid session UUIDs for this bot
              const validUuids = new Set<string>();
              if (sessionsResponse.currentSession) {
                validUuids.add(sessionsResponse.currentSession.uuid);
              }
              sessionsResponse.history.forEach((s: any) => validUuids.add(s.uuid));

              // Check each tab for this bot
              for (const tab of botTabs) {
                // If tab has no sessionUuid (new unsaved session), keep it
                if (!tab.sessionUuid) {
                  validTabIds.add(tab.id);
                  continue;
                }

                // If sessionUuid exists in backend, keep the tab
                if (validUuids.has(tab.sessionUuid)) {
                  validTabIds.add(tab.id);
                }
                // Otherwise tab will be removed (session deleted from backend)
              }
            } catch (error) {
              console.error(`Error validating sessions for bot ${botId}:`, error);
              // On error, keep all tabs for this bot (fail-safe)
              botTabs.forEach(tab => validTabIds.add(tab.id));
            }
          }

          // Filter tabs to only valid ones
          const validTabs = state.tabs.filter(tab => validTabIds.has(tab.id));

          // Only update if tabs were actually removed
          if (validTabs.length !== state.tabs.length) {
            let newActiveTabId = state.activeTabId;

            // If active tab was removed, switch to first valid tab
            if (state.activeTabId && !validTabIds.has(state.activeTabId)) {
              newActiveTabId = validTabs.length > 0 ? validTabs[0].id : null;
            }

            set({
              tabs: validTabs,
              activeTabId: newActiveTabId,
            });

            console.log(`✓ Tab validation: removed ${state.tabs.length - validTabs.length} tabs with deleted sessions`);
          } else {
            console.log('✓ Tab validation: all tabs valid');
          }
        } catch (error) {
          console.error('Error validating tabs:', error);
          // Fail-safe: keep all tabs if validation fails completely
        }
      },

      /**
       * Clear all workspace-specific data (tabs, sessions)
       * Called when switching workspaces
       */
      clearWorkspaceData: () => {
        set({
          tabs: [],
          activeTabId: null,
          hasInitialized: false,
        });
        console.log('✓ Cleared workspace data');
      },

      /**
       * Set current workspace path and clear data if workspace changed
       */
      setWorkspacePath: (path: string) => {
        const currentWorkspace = get().workspacePath;
        if (currentWorkspace && currentWorkspace !== path) {
          // Workspace changed - clear all data
          get().clearWorkspaceData();
        }
        set({ workspacePath: path });
      },

      /**
       * Set bot server URL
       */
      setBotServerUrl: (url: string) => {
        console.log(`🔧 Setting bot server URL to: ${url}`);
        set({ botServerUrl: url });
      },

      /**
       * Load workspace state from Supabase
       * Call this after workspace identification and user auth
       */
      loadWorkspaceState: async (workspaceId: string) => {
        try {
          // Import supabase and api client here to avoid circular dependency
          const { supabase } = await import('@/lib/supabase');
          const { apiFetch } = await import('@/lib/api-client');

          // Get auth session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('⚠️  No auth session, skipping workspace state load');
            return;
          }

          const response = await apiFetch(
            `/api/workspace/state?workspaceId=${workspaceId}`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );

          if (!response.ok) {
            console.error('Failed to load workspace state:', await response.text());
            return;
          }

          const data = await response.json();

          if (data.success && data.state) {
            console.log(`📂 Loading workspace state from Supabase (${data.state.tabs?.length || 0} tabs)`);

            set({
              tabs: data.state.tabs || [],
              activeTabId: data.state.activeTabId || null,
            });

            console.log('✅ Workspace state loaded from Supabase');
          } else {
            console.log('ℹ️  No saved workspace state found in Supabase');
          }
        } catch (error) {
          console.error('Error loading workspace state:', error);
          // Fail-safe: keep current state if load fails
        }
      },

      /**
       * Save current workspace state to Supabase
       * Debounced to avoid excessive API calls
       */
      saveWorkspaceState: async (workspaceId: string) => {
        try {
          const state = get();

          // Import supabase here to avoid circular dependency
          const { supabase } = await import('@/lib/supabase');

          // Get auth session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('⚠️  No auth session, skipping workspace state save');
            return;
          }

          const stateToSave = {
            tabs: state.tabs,
            activeTabId: state.activeTabId,
          };

          const { apiFetch } = await import('@/lib/api-client');
          const response = await apiFetch('/api/workspace/state', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              workspaceId,
              state: stateToSave,
            }),
          });

          if (!response.ok) {
            console.error('Failed to save workspace state:', await response.text());
            return;
          }

          console.log('💾 Workspace state saved to Supabase');
        } catch (error) {
          console.error('Error saving workspace state:', error);
          // Fail silently - localStorage still has the data
        }
      },
      }),
      {
        name: 'labcart-tab-storage', // localStorage key
        partialize: (state) => ({
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          userId: state.userId,
          workspacePath: state.workspacePath,
          botServerUrl: state.botServerUrl,
        }),
        migrate: (persistedState: any, version: number) => {
          // Ensure all tabs have proper type discriminator
          if (persistedState && persistedState.tabs) {
            persistedState.tabs = persistedState.tabs
              .map((tab: any) => {
                // Skip invalid tabs
                if (!tab || !tab.id) return null;

                // Chat tab migration
                if (tab.botId) {
                  return {
                    type: 'chat',
                    id: tab.id,
                    botId: tab.botId,
                    botName: tab.botName || 'Unknown Bot',
                    sessionUuid: tab.sessionUuid || null,
                    messages: tab.messages || [],
                    isLoading: tab.isLoading || false,
                    lastActivity: tab.lastActivity || Date.now(),
                  };
                }

                // File tab migration
                if (tab.filePath || tab.type === 'file') {
                  const fileName = tab.fileName || (tab.filePath ? tab.filePath.split('/').pop() : 'Untitled');
                  return {
                    type: 'file',
                    id: tab.id,
                    filePath: tab.filePath || '',
                    fileName: fileName || 'Untitled',
                    lastActivity: tab.lastActivity || Date.now(),
                  };
                }

                // Unknown tab type, skip it
                return null;
              })
              .filter((tab: any) => tab !== null);
          }

          return persistedState;
        },
      }
    ),
    { name: 'TabStore' }
  )
);

export default useTabStore;
