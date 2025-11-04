'use client';

import { useState, useEffect, useRef } from 'react';
import { Circle, Loader2, Check, Plus, Settings, MoreVertical, PanelLeft, PanelRight } from 'lucide-react';
import { useBot } from '@/contexts/BotContext';
import useTabStore from '@/store/tabStore';
import { api } from '@/services/api';

interface RightSidebarProps {
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

export default function RightSidebar({
  showLeftSidebar,
  showRightSidebar,
  onToggleLeftSidebar,
  onToggleRightSidebar
}: RightSidebarProps) {
  const { currentBot, setCurrentBot, availableBots } = useBot();
  const { addTab, updateTabMessages, userId, tabs, setActiveTab, replaceTabSession } = useTabStore();
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '> Terminal ready',
    '> Waiting for bot activity...'
  ]);
  const [activeTerminalTab, setActiveTerminalTab] = useState(0);
  const [terminalTabs, setTerminalTabs] = useState([
    { id: 0, name: 'Terminal 1' },
    { id: 1, name: 'Terminal 2' }
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // ========================================================================
  // Handle Team Member Click
  // ========================================================================

  /**
   * Open existing session or create new one if none exists
   */
  const handleBotClick = async (bot: { id: string; name: string }) => {
    setCurrentBot(bot);

    // FIRST: Check if we already have a tab open for this bot
    const existingTab = tabs.find(tab => tab.botId === bot.id);
    if (existingTab) {
      // Just switch to the existing tab
      setActiveTab(existingTab.id);
      return;
    }

    // If no userId yet, just open a new tab
    if (!userId) {
      addTab(bot.id, bot.name);
      return;
    }

    try {
      // Check if there's an existing session for this bot+user
      const sessionsResponse = await api.session.getSessions(bot.id, userId);

      // Check current session first, then history
      const sessionToLoad = sessionsResponse.currentSession ||
                           (sessionsResponse.history.length > 0 ? sessionsResponse.history[0] : null);

      if (sessionToLoad) {
        // Found existing session - load it
        const sessionUuid = sessionToLoad.uuid;

        // Create tab with the existing sessionUuid
        addTab(bot.id, bot.name, sessionUuid);

        // Load messages from that session
        const messagesResponse = await api.session.getMessages(sessionUuid);
        if (messagesResponse.messages) {
          const tabId = `${bot.id}-${sessionUuid}`;
          updateTabMessages(tabId, messagesResponse.messages);
        }
      } else {
        // No existing session - open fresh tab
        addTab(bot.id, bot.name);
      }
    } catch (error) {
      console.error('Error loading session for bot:', error);
      // Fallback: just open a new tab
      addTab(bot.id, bot.name);
    }
  };

  /**
   * Force create a new fresh session (ignoring existing sessions)
   * Replaces the bot's existing tab with a fresh session
   */
  const handleNewSession = async (bot: { id: string; name: string }, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering handleBotClick
    setCurrentBot(bot);

    // If we have a userId, call backend to archive old session first
    if (userId) {
      try {
        await api.session.createNewSession({
          botId: bot.id,
          userId: userId
        });
      } catch (error) {
        console.error('Error creating new session:', error);
        // Continue anyway - frontend will still create new tab
      }
    }

    // Replace existing tab with new session (enforces one tab per bot)
    replaceTabSession(bot.id, bot.name, null, []);
  };

  /**
   * Open bot settings (placeholder for now)
   */
  const handleBotSettings = (bot: { id: string; name: string }, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering handleBotClick
    console.log('Opening settings for:', bot.name);
    // TODO: Open bot settings modal/page
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  return (
    <div className={`h-full flex-shrink-0 flex flex-col ${showRightSidebar ? 'w-[320px]' : 'w-auto'}`}>
      {/* Sidebar Toggle Buttons */}
      <div className="flex items-center justify-end gap-1 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onToggleLeftSidebar}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          title={showLeftSidebar ? 'Hide Left Sidebar' : 'Show Left Sidebar'}
        >
          <PanelLeft size={16} style={{ color: 'var(--text)', opacity: showLeftSidebar ? 1 : 0.3 }} />
        </button>
        <button
          onClick={onToggleRightSidebar}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          title={showRightSidebar ? 'Hide Right Sidebar' : 'Show Right Sidebar'}
        >
          <PanelRight size={16} style={{ color: 'var(--text)', opacity: showRightSidebar ? 1 : 0.3 }} />
        </button>
      </div>

      {/* Scrollable top sections - only show when sidebar is expanded */}
      {showRightSidebar && (
      <div className="flex-1 overflow-y-auto">
        {/* Team Section */}
        <div className="p-3">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>TEAM</h2>
          <div className="space-y-2">
            {availableBots.map((bot) => {
              const initial = bot.name.charAt(0).toUpperCase();

              return (
                <div
                  key={bot.id}
                  className="group flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer relative"
                  onClick={() => handleBotClick(bot)}
                >
                  {/* Avatar */}
                  {bot.avatar ? (
                    <img src={bot.avatar} alt={bot.name} className="w-5 h-5 rounded flex-shrink-0" />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--text)' }}>{initial}</span>
                    </div>
                  )}

                  {/* Bot Name */}
                  <span className="text-sm flex-1" style={{ color: 'var(--text)' }}>
                    {bot.name}
                  </span>

                  {/* Hover Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* New Session Icon */}
                    <button
                      onClick={(e) => handleNewSession(bot, e)}
                      className="w-6 h-6 flex items-center justify-center"
                      title="New Session"
                    >
                      <Plus size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
                    </button>

                    {/* Settings Icon */}
                    <button
                      onClick={(e) => handleBotSettings(bot, e)}
                      className="w-6 h-6 flex items-center justify-center"
                      title="Bot Settings"
                    >
                      <Settings size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-3 my-2" style={{ backgroundColor: 'var(--border)' }} />

        {/* Plans Section */}
        <div className="p-3">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>PLANS</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#dc3545' }}></span>
              <span className="text-sm" style={{ color: 'var(--text)' }}>Q4 Roadmap</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#fbbf24' }}></span>
              <span className="text-sm" style={{ color: 'var(--text)' }}>MVP Launch</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#28a745' }}></span>
              <span className="text-sm" style={{ color: 'var(--text)' }}>Tech Debt</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="text-sm" style={{ color: 'var(--text)', opacity: 0.5 }}>+ New Plan</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-3 my-2" style={{ backgroundColor: 'var(--border)' }} />

        {/* Tasks Section */}
        <div className="p-3">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>TASKS</h2>

          {/* All Tasks - status icons */}
          <div className="space-y-2">
            {/* Task 1 - Not started */}
            <div className="group flex items-start gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <Circle size={14} className="flex-shrink-0 self-center mr-0.5" style={{ color: 'var(--text)', opacity: 0.4 }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm" style={{ color: 'var(--text)' }}>#234 Auth</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text)', opacity: 0.5 }}>Assigned to Finn</div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center flex-shrink-0 self-center"
                title="Task options"
              >
                <MoreVertical size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
              </button>
            </div>

            {/* Task 2 - In progress */}
            <div className="group flex items-start gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <Loader2 size={14} className="flex-shrink-0 animate-spin self-center mr-0.5" style={{ color: 'var(--text)', opacity: 0.4 }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm" style={{ color: 'var(--text)' }}>#235 UX</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text)', opacity: 0.5 }}>In Progress with Matty...</div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center flex-shrink-0 self-center"
                title="Task options"
              >
                <MoreVertical size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
              </button>
            </div>

            {/* Task 3 - Completed */}
            <div className="group flex items-start gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <Check size={14} className="flex-shrink-0 self-center mr-0.5" style={{ color: 'var(--text)', opacity: 0.4 }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm" style={{ color: 'var(--text)' }}>#236 Bug fix</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text)', opacity: 0.5 }}>
                  Completed commit view:{' '}
                  <a href="#" className="hover:underline" style={{ color: 'var(--text)', opacity: 0.7 }}>
                    646c0ac
                  </a>
                </div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center flex-shrink-0 self-center"
                title="Task options"
              >
                <MoreVertical size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
              </button>
            </div>

            {/* New Task Button */}
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="text-sm" style={{ color: 'var(--text)', opacity: 0.5 }}>+ New Task</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-3 my-2" style={{ backgroundColor: 'var(--border)' }} />

        {/* Terminal Section - Fixed at bottom */}
        <div className="h-[300px] flex-shrink-0 border-t flex flex-col" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
        {/* Terminal Tabs */}
        <div className="flex items-center gap-1 px-2 py-1 border-b" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          {terminalTabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 py-1 rounded-t text-xs cursor-pointer ${
                activeTerminalTab === tab.id ? 'border border-b-0' : ''
              }`}
              style={
                activeTerminalTab === tab.id
                  ? { backgroundColor: 'var(--background)', borderColor: 'var(--border)' }
                  : { color: 'var(--text)', opacity: 0.6 }
              }
              onClick={() => setActiveTerminalTab(tab.id)}
            >
              <span>{tab.name}</span>
              <button className="text-xs hover:bg-black/10 rounded px-1" style={{ opacity: 0.5 }}>×</button>
            </div>
          ))}
          <button className="px-2 py-1 text-xs hover:bg-white/50 rounded" style={{ color: 'var(--text)', opacity: 0.5 }}>
            +
          </button>
        </div>

        {/* Terminal Content */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs" style={{ color: 'var(--text)' }}>
          {terminalLines.map((line, index) => (
            <div key={index} className="mb-1">
              {line}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
    )}
    </div>
  );
}
