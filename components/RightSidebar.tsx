'use client';

import { useState, useEffect, useRef } from 'react';
import { Circle, Loader2, Check } from 'lucide-react';

export default function RightSidebar() {
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

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col">
      {/* Scrollable top sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Team Section */}
        <div className="p-3">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>TEAM</h2>
          <div className="space-y-2">
            {/* Main - pinned at top, visually distinct */}
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer border" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Main</span>
              <span className="text-xs ml-auto" style={{ opacity: 0.5 }}>📌</span>
            </div>

            {/* Other bots */}
            <div className="flex items-center gap-2 p-2 rounded cursor-pointer" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Finn</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="text-sm" style={{ color: 'var(--text)' }}>Matty</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="text-sm" style={{ color: 'var(--text)' }}>Rick</span>
            </div>
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
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <Circle size={14} className="flex-shrink-0" style={{ color: 'var(--text)', opacity: 0.4 }} />
              <span className="text-sm" style={{ color: 'var(--text)' }}>#234 Auth</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <Loader2 size={14} className="flex-shrink-0 animate-spin" style={{ color: 'var(--text)', opacity: 0.4 }} />
              <span className="text-sm" style={{ color: 'var(--text)' }}>#235 UX</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <Check size={14} className="flex-shrink-0" style={{ color: 'var(--text)', opacity: 0.4 }} />
              <span className="text-sm" style={{ color: 'var(--text)' }}>#236 Bug fix</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer">
              <span className="text-sm" style={{ color: 'var(--text)', opacity: 0.5 }}>+ New Task</span>
            </div>
          </div>
        </div>
      </div>

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
  );
}
