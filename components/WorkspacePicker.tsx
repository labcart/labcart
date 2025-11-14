'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Check, AlertCircle } from 'lucide-react';

interface WorkspacePickerProps {
  onWorkspaceSelected: (path: string) => void;
}

/**
 * WorkspacePicker - Modal for selecting workspace folder
 *
 * Displays on first run or when user needs to change workspace.
 * Matches conductor.build minimal macOS aesthetic.
 *
 * Works in three modes:
 * 1. Electron: Native folder picker via IPC (returns full path directly)
 * 2. Chrome/Edge: File System Access API + backend path resolution
 *    - User picks folder with native browser picker
 *    - Browser returns folder name only (e.g., "labcart")
 *    - Backend resolves to full path (e.g., "/Users/macbook/play/lab/labcart")
 * 3. Firefox/Fallback: Manual path input
 */
export default function WorkspacePicker({ onWorkspaceSelected }: WorkspacePickerProps) {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [manualPath, setManualPath] = useState<string>('');
  const [isElectron, setIsElectron] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [supportsFileSystemAccess, setSupportsFileSystemAccess] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Check if running in Electron
    const electronCheck = typeof window !== 'undefined' && (window as any).electron !== undefined;
    setIsElectron(electronCheck);

    // Check if browser supports File System Access API
    if (!electronCheck && typeof window !== 'undefined') {
      const hasFileSystemAccess = 'showDirectoryPicker' in window;
      setSupportsFileSystemAccess(hasFileSystemAccess);
      setShowManualInput(!hasFileSystemAccess); // Only show manual input if no picker available
    }
  }, []);

  const handleOpenFolderPicker = async () => {
    setError('');

    if (isElectron) {
      // Electron: Use native IPC picker (returns full path directly)
      try {
        const path = await (window as any).electron.selectFolder();
        if (path) {
          setSelectedPath(path);
          onWorkspaceSelected(path);
        }
      } catch (error) {
        console.error('Error opening folder picker:', error);
        setError('Failed to open folder picker. Please try again.');
      }
    } else if (supportsFileSystemAccess) {
      // Browser: Use File System Access API + backend path resolution
      try {
        // Open native folder picker
        const dirHandle = await (window as any).showDirectoryPicker();
        const folderName = dirHandle.name;

        console.log(`📁 Selected folder: "${folderName}"`);
        console.log('🔍 Resolving full path via bot server...');

        // Call bot server to resolve folder name to full path
        const response = await fetch('http://localhost:3010/resolve-workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName }),
        });

        const data = await response.json();

        if (response.ok && data.path) {
          console.log(`✅ Resolved to: ${data.path}`);
          setSelectedPath(data.path);
          onWorkspaceSelected(data.path);
        } else {
          console.error('Failed to resolve path:', data);
          setError(data.message || 'Could not find the selected folder. Please try manual input.');
          setShowManualInput(true);
        }
      } catch (error: any) {
        // User cancelled or picker failed
        if (error.name === 'AbortError') {
          console.log('User cancelled folder selection');
        } else {
          console.error('Error with folder picker:', error);
          setError('Failed to open folder picker. Please try manual input.');
          setShowManualInput(true);
        }
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
          <div className="space-y-4">
            {/* Description */}
            <p className="text-sm" style={{ color: '#7a7875' }}>
              {isElectron
                ? 'Select a folder to use as your workspace. This is where your project files and chat history will be stored.'
                : supportsFileSystemAccess
                ? 'Select a folder to use as your workspace. Your files remain on your computer - we only access them with your permission.'
                : 'Your browser doesn\'t support the native folder picker. Please enter the absolute path to your workspace folder.'}
            </p>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
                <AlertCircle size={16} style={{ color: '#856404', marginTop: '2px' }} />
                <span className="text-sm" style={{ color: '#856404' }}>
                  {error}
                </span>
              </div>
            )}

            {(isElectron || supportsFileSystemAccess) && !showManualInput ? (
              /* Electron or Browser with File System Access API: Native picker button */
              <>
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

                {/* Selected path display */}
                {selectedPath && (
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#f6f6f5' }}>
                    <Check size={16} style={{ color: '#28a745' }} />
                    <span className="font-mono text-sm" style={{ color: '#2c2826' }}>
                      {selectedPath}
                    </span>
                  </div>
                )}

                {/* Manual input fallback for browsers */}
                {!isElectron && (
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="text-sm underline"
                    style={{ color: '#7a7875' }}
                  >
                    Enter path manually instead
                  </button>
                )}
              </>
            ) : (
              /* Browser mode: Manual path input */
              <form onSubmit={handleManualPathSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg flex items-center justify-center gap-3 transition-all duration-150 font-medium"
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
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
