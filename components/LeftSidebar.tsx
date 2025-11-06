'use client';

import { useState } from 'react';
import { Home, Files, Wrench, Search, Settings } from 'lucide-react';
import FileExplorer from './FileExplorer';

interface LeftSidebarProps {
  onFileOpen?: (filePath: string) => void;
  onHomeClick?: () => void;
}

export default function LeftSidebar({ onFileOpen, onHomeClick }: LeftSidebarProps) {
  const [activeView, setActiveView] = useState<'explorer' | 'tools' | 'search'>('explorer');

  const handleFileClick = (filePath: string) => {
    console.log('File clicked:', filePath);
    if (onFileOpen) {
      onFileOpen(filePath);
    }
  };

  return (
    <div className="h-full border-r flex flex-col flex-shrink-0" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)', width: '250px' }}>
      {/* Icon Menu Bar - Above everything */}
      <div className="flex items-center justify-center gap-1 px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onHomeClick}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
          title="Change Workspace"
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* File Explorer Section */}
        {activeView === 'explorer' && (
          <FileExplorer onFileClick={handleFileClick} />
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
