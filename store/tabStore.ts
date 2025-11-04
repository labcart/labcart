/**
 * Tab Store (Zustand)
 *
 * Global state management for chat tabs and sessions.
 * Handles tab lifecycle, message routing, and active tab tracking.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TabStore, ChatTab, Message } from '@/types';

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
       * Replace all messages in a tab (for loading from backend)
       */
      updateTabMessages: (tabId: string, messages: Message[]) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, messages, lastActivity: Date.now() }
              : tab
          ),
        }));
      },

      /**
       * Add a single message to a tab (for real-time updates)
       */
      addMessageToTab: (tabId: string, message: Message) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
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
       * Set tab loading state
       */
      setTabLoading: (tabId: string, isLoading: boolean) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, isLoading } : tab
          ),
        }));
      },

      /**
       * Update tab's session UUID (when backend creates session)
       */
      setTabSessionUuid: (tabId: string, sessionUuid: string) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, sessionUuid } : tab
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
          // Find existing tab for this bot
          const existingTab = state.tabs.find((t) => t.botId === botId);

          if (existingTab) {
            // Replace the existing tab's session
            const newTabId = sessionUuid
              ? `${botId}-${sessionUuid}`
              : `${botId}-new-${Date.now()}`;

            return {
              tabs: state.tabs.map((tab) =>
                tab.id === existingTab.id
                  ? {
                      ...tab,
                      id: newTabId,
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
       * Set user ID (from localStorage on app init)
       */
      setUserId: (userId: number) => {
        set({ userId });
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

          // Group tabs by botId to minimize API calls
          const tabsByBot = new Map<string, ChatTab[]>();
          for (const tab of state.tabs) {
            if (!tabsByBot.has(tab.botId)) {
              tabsByBot.set(tab.botId, []);
            }
            tabsByBot.get(tab.botId)!.push(tab);
          }

          const validTabIds = new Set<string>();

          // Check each bot's sessions
          for (const [botId, botTabs] of tabsByBot.entries()) {
            try {
              const sessionsResponse = await api.session.getSessions(botId, state.userId);

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
      }),
      {
        name: 'labcart-tab-storage', // localStorage key
        partialize: (state) => ({
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          userId: state.userId,
        }),
      }
    ),
    { name: 'TabStore' }
  )
);

export default useTabStore;
