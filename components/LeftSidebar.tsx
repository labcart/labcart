'use client';

import { useState } from 'react';
import { Home, Files, Wrench, Search, Settings } from 'lucide-react';

export default function LeftSidebar() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [activeView, setActiveView] = useState<'explorer' | 'tools' | 'search'>('explorer');

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="w-[250px] flex-shrink-0 border-r flex flex-col" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
      {/* Icon Menu Bar - Above everything */}
      <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => {/* TODO: Navigate to home page */}}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          title="Home"
        >
          <Home size={18} style={{ color: 'var(--text)' }} />
        </button>
        <button
          onClick={() => setActiveView('explorer')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          style={{ backgroundColor: activeView === 'explorer' ? 'rgba(96, 165, 250, 0.15)' : 'transparent' }}
          title="File Explorer"
        >
          <Files size={18} style={{ color: 'var(--text)' }} />
        </button>
        <button
          onClick={() => setActiveView('tools')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          style={{ backgroundColor: activeView === 'tools' ? 'rgba(96, 165, 250, 0.15)' : 'transparent' }}
          title="Tools"
        >
          <Wrench size={18} style={{ color: 'var(--text)' }} />
        </button>
        <button
          onClick={() => setActiveView('search')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          style={{ backgroundColor: activeView === 'search' ? 'rgba(96, 165, 250, 0.15)' : 'transparent' }}
          title="Search"
        >
          <Search size={18} style={{ color: 'var(--text)' }} />
        </button>
        <button
          onClick={() => {/* TODO: Settings view */}}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          title="Settings"
        >
          <Settings size={18} style={{ color: 'var(--text)' }} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* File Explorer Section */}
        {activeView === 'explorer' && (
          <>
            <div className="p-3">
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>EXPLORER</h2>

              <div className="space-y-1">
                {/* Root folder */}
                <div>
                  <div
                    className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm"
                    onClick={() => toggleFolder('root')}
                  >
                    <span className="text-xs" style={{ color: 'var(--text)' }}>{expandedFolders.has('root') ? '▼' : '▶'}</span>
                    <span style={{ color: 'var(--text)' }}>labcart</span>
                  </div>

                  {expandedFolders.has('root') && (
                    <div className="ml-4 space-y-1">
                      {/* components folder */}
                      <div>
                        <div
                          className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm"
                          onClick={() => toggleFolder('components')}
                        >
                          <span className="text-xs" style={{ color: 'var(--text)' }}>{expandedFolders.has('components') ? '▼' : '▶'}</span>
                          <span style={{ color: 'var(--text)' }}>components</span>
                        </div>
                        {expandedFolders.has('components') && (
                          <div className="ml-4 space-y-1">
                            <div className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm">
                              <span className="text-xs invisible">▶</span>
                              <span style={{ color: 'var(--text)' }}>ChatWindow.tsx</span>
                            </div>
                            <div className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm">
                              <span className="text-xs invisible">▶</span>
                              <span style={{ color: 'var(--text)' }}>LeftSidebar.tsx</span>
                            </div>
                            <div className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm">
                              <span className="text-xs invisible">▶</span>
                              <span style={{ color: 'var(--text)' }}>RightSidebar.tsx</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* app folder */}
                      <div>
                        <div
                          className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm"
                          onClick={() => toggleFolder('app')}
                        >
                          <span className="text-xs" style={{ color: 'var(--text)' }}>{expandedFolders.has('app') ? '▼' : '▶'}</span>
                          <span style={{ color: 'var(--text)' }}>app</span>
                        </div>
                        {expandedFolders.has('app') && (
                          <div className="ml-4 space-y-1">
                            <div className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm">
                              <span className="text-xs invisible">▶</span>
                              <span style={{ color: 'var(--text)' }}>page.tsx</span>
                            </div>
                            <div className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm">
                              <span className="text-xs invisible">▶</span>
                              <span style={{ color: 'var(--text)' }}>globals.css</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* package.json */}
                      <div className="flex items-center gap-1 p-1 rounded hover:bg-black/5 cursor-pointer text-sm">
                        <span className="text-xs invisible">▶</span>
                        <span style={{ color: 'var(--text)' }}>package.json</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px mx-3 my-2" style={{ backgroundColor: 'var(--border)' }} />

            {/* Available Tools Section */}
            <div className="p-3">
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>TOOLS</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                  <span className="text-sm">•</span>
                  <span className="text-sm" style={{ color: 'var(--text)' }}>TTS</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                  <span className="text-sm">•</span>
                  <span className="text-sm" style={{ color: 'var(--text)' }}>Image Gen</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                  <span className="text-sm">•</span>
                  <span className="text-sm" style={{ color: 'var(--text)' }}>GitHub</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Full Tools View */}
        {activeView === 'tools' && (
          <div className="p-3">
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>ALL TOOLS</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                <span className="text-sm">•</span>
                <span className="text-sm" style={{ color: 'var(--text)' }}>TTS</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                <span className="text-sm">•</span>
                <span className="text-sm" style={{ color: 'var(--text)' }}>Image Gen</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                <span className="text-sm">•</span>
                <span className="text-sm" style={{ color: 'var(--text)' }}>GitHub</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                <span className="text-sm">•</span>
                <span className="text-sm" style={{ color: 'var(--text)' }}>Playwright</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
                <span className="text-sm">•</span>
                <span className="text-sm" style={{ color: 'var(--text)' }}>Database</span>
              </div>
            </div>
          </div>
        )}

        {/* Search View */}
        {activeView === 'search' && (
          <div className="p-3">
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>SEARCH</h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search files..."
                className="w-full px-2 py-1 rounded border text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
