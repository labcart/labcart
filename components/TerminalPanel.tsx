'use client';

import { useState, useEffect } from 'react';
import { Plus, RotateCw, X } from 'lucide-react';
import type { ISocket } from '@/hooks/useSocket';
import TerminalInstance from './TerminalInstance';

interface Terminal {
  id: string;
  name: string;
  cwd: string;
}

interface TerminalPanelProps {
  socket: ISocket | null;
  defaultCwd?: string;
}

export default function TerminalPanel({ socket, defaultCwd }: TerminalPanelProps) {
  const [terminals, setTerminals] = useState<Terminal[]>([
    { id: 'terminal-1', name: 'bash', cwd: defaultCwd || '/' }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('terminal-1');
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Detect platform for keyboard shortcut display
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const closeShortcut = isMac ? '⌘W' : 'Ctrl+W';

  // Keyboard shortcuts for terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W (or Cmd+W on Mac) - Close active terminal
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'w') {
        // Only handle if we're not editing a terminal name
        if (!editingTerminalId && terminals.length > 1) {
          e.preventDefault();
          const newTerminals = terminals.filter(t => t.id !== activeTerminalId);
          setTerminals(newTerminals);
          setActiveTerminalId(newTerminals[0].id);

          // Emit kill event
          if (socket) {
            socket.emit('terminal:kill', { terminalId: activeTerminalId });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMac, editingTerminalId, terminals, activeTerminalId, socket]);

  // Handle new terminal
  const handleNewTerminal = () => {
    const newId = `terminal-${Date.now()}`;

    setTerminals([...terminals, {
      id: newId,
      name: 'bash',
      cwd: defaultCwd || '/'
    }]);
    setActiveTerminalId(newId);
  };

  // Handle refresh terminal (kill and recreate)
  const handleRefreshTerminal = () => {
    if (!socket || !activeTerminalId) return;

    console.log(`🔄 Refreshing terminal ${activeTerminalId}`);

    // Force remount by changing ID
    const newId = `terminal-${Date.now()}`;
    setTerminals(terminals.map(t =>
      t.id === activeTerminalId
        ? { ...t, id: newId }
        : t
    ));
    setActiveTerminalId(newId);
  };

  // Handle close terminal
  const handleCloseTerminal = (terminalId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (terminals.length === 1) return; // Don't close last terminal

    const newTerminals = terminals.filter(t => t.id !== terminalId);
    setTerminals(newTerminals);

    // Switch to another terminal if closing active one
    if (activeTerminalId === terminalId) {
      setActiveTerminalId(newTerminals[0].id);
    }

    // Emit kill event to backend
    if (socket) {
      socket.emit('terminal:kill', { terminalId });
    }
  };

  // Handle rename terminal
  const handleStartRename = (terminalId: string, currentName: string, e: React.MouseEvent) => {
    // Only allow renaming if this terminal is already active
    if (terminalId !== activeTerminalId) {
      // Don't stop propagation - let it bubble to activate the tab
      return;
    }
    // Stop propagation only when actually renaming
    e.stopPropagation();
    setEditingTerminalId(terminalId);
    setEditingName(currentName);
  };

  const handleFinishRename = (terminalId: string) => {
    if (editingName.trim()) {
      setTerminals(terminals.map(t =>
        t.id === terminalId ? { ...t, name: editingName.trim() } : t
      ));
    }
    setEditingTerminalId(null);
    setEditingName('');
  };

  const showTabs = terminals.length > 1;

  return (
    <div className="h-[300px] flex-shrink-0 border-t flex flex-col" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
      {/* Terminal Header Row */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>TERMINAL</span>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewTerminal}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/5 transition-colors"
            title="New Terminal"
          >
            <Plus size={14} style={{ color: 'var(--text)', opacity: 0.7 }} />
          </button>
          <button
            onClick={handleRefreshTerminal}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/5 transition-colors"
            title="Refresh Terminal"
          >
            <RotateCw size={14} style={{ color: 'var(--text)', opacity: 0.7 }} />
          </button>
        </div>
      </div>

      {/* Tab Bar Row - only show if multiple terminals */}
      {showTabs && (
        <div className="flex items-center gap-1 py-1 border-b" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          {terminals.map(term => {
            const isActive = term.id === activeTerminalId;
            return (
              <div
                key={term.id}
                onClick={() => setActiveTerminalId(term.id)}
                className={`flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-t text-sm border border-b-0 cursor-pointer hover:bg-black/5 ${
                  isActive ? '' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--background)' : 'transparent',
                  borderColor: isActive ? 'var(--border)' : 'transparent',
                }}
              >
                {editingTerminalId === term.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(term.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(term.id);
                      if (e.key === 'Escape') {
                        setEditingTerminalId(null);
                        setEditingName('');
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-16 px-1 bg-transparent outline-none"
                    style={{ color: 'var(--text)' }}
                  />
                ) : (
                  <span onClick={(e) => handleStartRename(term.id, term.name, e)} style={{ color: 'var(--text)' }}>
                    {term.name}
                  </span>
                )}
                <button
                  onClick={(e) => handleCloseTerminal(term.id, e)}
                  className="ml-1 p-1 hover:bg-black/10 rounded transition-colors"
                  style={{ color: 'var(--text)', opacity: 0.5 }}
                  title={`Close ${closeShortcut}`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Terminal Content - Each terminal is a separate component */}
      <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {terminals.map(term => (
          <TerminalInstance
            key={term.id}
            terminalId={term.id}
            socket={socket}
            cwd={term.cwd}
            isActive={term.id === activeTerminalId}
          />
        ))}
      </div>
    </div>
  );
}
