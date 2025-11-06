'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Check } from 'lucide-react';

interface WorkspacePickerProps {
  onWorkspaceSelected: (path: string) => void;
}

/**
 * WorkspacePicker - Modal for selecting workspace folder
 *
 * Displays on first run or when user needs to change workspace.
 * Matches conductor.build minimal macOS aesthetic.
 *
 * Works in two modes:
 * 1. Electron: Native folder picker via window.electron API
 * 2. Web: Manual path input as fallback
 */
export default function WorkspacePicker({ onWorkspaceSelected }: WorkspacePickerProps) {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [manualPath, setManualPath] = useState<string>('');
  const [isElectron, setIsElectron] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // TEMPORARY: Quick test folders for web development
  const testFolders = [
    '/opt/lab',
    '/opt/lab/claude-bot',
    '/opt/lab/labcart',
    '/opt/projects',
  ];

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== 'undefined' && (window as any).electron !== undefined);
  }, []);

  const handleOpenFolderPicker = async () => {
    if (isElectron) {
      // Electron mode: Use native folder picker
      try {
        const path = await (window as any).electron.selectFolder();
        if (path) {
          setSelectedPath(path);
          onWorkspaceSelected(path);
        }
      } catch (error) {
        console.error('Error opening folder picker:', error);
      }
    } else {
      // Web mode: User must type path manually
      if (manualPath.trim()) {
        setSelectedPath(manualPath);
        onWorkspaceSelected(manualPath);
      }
    }
  };

  const handleManualPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPath.trim()) {
      setSelectedPath(manualPath);
      onWorkspaceSelected(manualPath);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: '#f6f6f5' }}
    >
      {/* Welcome Card - Centered */}
      <div
        className="w-full max-w-md mx-4"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 border-b"
          style={{ borderColor: '#e0e0e0' }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: '#2c2826' }}
          >
            Select Workspace Folder
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {isElectron ? (
            /* Electron Mode: Native folder picker button */
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#7a7875' }}>
                Select a folder to use as your workspace. This is where your project files and chat history will be stored.
              </p>

              <button
                onClick={handleOpenFolderPicker}
                className="w-full px-6 py-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-150 font-medium"
                style={{
                  backgroundColor: '#2c2826',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#454340';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2c2826';
                }}
              >
                <FolderOpen size={20} />
                <span>Open Folder</span>
              </button>

              {selectedPath && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#f6f6f5' }}>
                  <Check size={16} style={{ color: '#28a745' }} />
                  <span className="font-mono text-sm" style={{ color: '#2c2826' }}>
                    {selectedPath}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Web Mode: Quick test list + manual input */
            <div className="space-y-4">
              {!showManualInput ? (
                <>
                  <p className="text-sm" style={{ color: '#7a7875' }}>
                    Quick select a test workspace:
                  </p>

                  {/* Quick test folders */}
                  <div className="space-y-2">
                    {testFolders.map((folder) => (
                      <button
                        key={folder}
                        onClick={() => {
                          setSelectedPath(folder);
                          onWorkspaceSelected(folder);
                        }}
                        className="w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-150 text-left"
                        style={{
                          backgroundColor: selectedPath === folder ? '#f6f6f5' : '#ffffff',
                          border: '1px solid #e0e0e0',
                          color: '#2c2826',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedPath !== folder) {
                            e.currentTarget.style.backgroundColor = '#f6f6f5';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedPath !== folder) {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }
                        }}
                      >
                        <FolderOpen size={16} style={{ color: '#7a7875' }} />
                        <span className="font-mono text-sm flex-1 truncate">
                          {folder}
                        </span>
                        {selectedPath === folder && (
                          <Check size={16} style={{ color: '#28a745' }} />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Manual input toggle */}
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="w-full text-sm py-2"
                    style={{ color: '#7a7875' }}
                  >
                    Or enter path manually →
                  </button>
                </>
              ) : (
                /* Manual input form */
                <form onSubmit={handleManualPathSubmit} className="space-y-4">
                  <p className="text-sm" style={{ color: '#7a7875' }}>
                    Enter the absolute path to your workspace folder:
                  </p>

                  <input
                    type="text"
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    placeholder="/absolute/path/to/workspace"
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e0e0e0',
                      color: '#2c2826',
                    }}
                    autoFocus
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(false)}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#f6f6f5',
                        color: '#2c2826',
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 rounded-lg flex items-center justify-center gap-3 transition-all duration-150 font-medium"
                      style={{
                        backgroundColor: '#2c2826',
                        color: '#ffffff',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#454340';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2c2826';
                      }}
                    >
                      <Check size={20} />
                      <span>Select Workspace</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
