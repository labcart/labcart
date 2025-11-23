'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import ContextMenu, { ContextMenuSection } from './ContextMenu';
import Toast, { ToastType } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import useWorkspaceStore from '@/store/workspaceStore';
import useTabStore from '@/store/tabStore';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface FileExplorerProps {
  onFileClick: (filePath: string) => void;
}

export default function FileExplorer({ onFileClick }: FileExplorerProps) {
  const { workspacePath } = useWorkspaceStore();
  const { userId } = useTabStore();
  const [rootFiles, setRootFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isDirectory: boolean } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [originalRenameValue, setOriginalRenameValue] = useState(''); // Track original name
  const renameInputRef = useRef<HTMLInputElement>(null);
  const explorerRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [clipboard, setClipboard] = useState<{ paths: string[]; operation: 'cut' | 'copy' } | null>(null);

  useEffect(() => {
    if (!workspacePath || !userId) return;

    loadDirectory(workspacePath);

    // Set up file system watcher for auto-refresh (via proxy)
    const proxyUrl = 'https://ide-ws.labcart.io';
    const eventSource = new EventSource(`${proxyUrl}/proxy/files/watch?userId=${userId}&path=` + encodeURIComponent(workspacePath) + '&workspace=' + encodeURIComponent(workspacePath));

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'change') {
        console.log('File system changed, refreshing...', data);
        loadDirectory(workspacePath);
      }
    };

    eventSource.onerror = (error) => {
      console.error('File watcher error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [workspacePath, userId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if explorer is focused or no other input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Delete key - delete selected files
      if (e.key === 'Delete' && selectedFiles.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }

      // F2 - rename selected file (only if single selection)
      if (e.key === 'F2' && selectedFiles.size === 1) {
        e.preventDefault();
        const path = Array.from(selectedFiles)[0];
        startRename(path);
      }

      // Cmd/Ctrl+X - Cut
      if ((e.metaKey || e.ctrlKey) && e.key === 'x' && selectedFiles.size > 0) {
        e.preventDefault();
        setClipboard({ paths: Array.from(selectedFiles), operation: 'cut' });
        setToast({ message: `Cut ${selectedFiles.size} item${selectedFiles.size > 1 ? 's' : ''}`, type: 'info' });
      }

      // Cmd/Ctrl+C - Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedFiles.size > 0) {
        e.preventDefault();
        setClipboard({ paths: Array.from(selectedFiles), operation: 'copy' });
        setToast({ message: `Copied ${selectedFiles.size} item${selectedFiles.size > 1 ? 's' : ''}`, type: 'info' });
      }

      // Cmd/Ctrl+V - Paste (only if clipboard has items)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        e.preventDefault();
        // Get the first selected path or use root as target
        const targetPath = selectedFiles.size > 0 ? Array.from(selectedFiles)[0] : workspacePath;
        handlePaste(targetPath);
      }

      // Escape - clear selection
      if (e.key === 'Escape') {
        setSelectedFiles(new Set());
        setLastSelected(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFiles, clipboard]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      // Select filename without extension
      const lastDot = renameValue.lastIndexOf('.');
      if (lastDot > 0) {
        renameInputRef.current.setSelectionRange(0, lastDot);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingPath]);

  // Don't render if no workspace selected (must be AFTER all hooks)
  if (!workspacePath) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        <p>No workspace selected</p>
        <p className="text-xs mt-2">Select a workspace folder to view files</p>
      </div>
    );
  }

  const loadDirectory = async (dirPath: string) => {
    try {
      if (!userId) return [];

      const proxyUrl = 'https://ide-ws.labcart.io';
      const response = await fetch(`${proxyUrl}/proxy/files?userId=${userId}&path=${encodeURIComponent(dirPath)}&workspace=${encodeURIComponent(workspacePath)}`);
      const data = await response.json();

      if (!response.ok || !data.files) {
        console.error('Error loading directory:', data.error || 'No files returned');
        setLoading(false);
        return [];
      }

      if (dirPath === workspacePath) {
        setRootFiles(data.files.map((file: FileNode) => ({
          ...file,
          isExpanded: false,
          children: file.isDirectory ? [] : undefined
        })));
        setLoading(false);
      }

      return data.files;
    } catch (error) {
      console.error('Error loading directory:', error);
      setLoading(false);
      return [];
    }
  };

  const toggleDirectory = async (filePath: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === filePath && node.isDirectory) {
          if (!node.isExpanded) {
            // Load children if not already loaded
            loadDirectory(filePath).then(children => {
              setRootFiles(prevFiles => {
                const update = (nodes: FileNode[]): FileNode[] => {
                  return nodes.map(n => {
                    if (n.path === filePath) {
                      return { ...n, children, isExpanded: true };
                    }
                    if (n.children) {
                      return { ...n, children: update(n.children) };
                    }
                    return n;
                  });
                };
                return update(prevFiles);
              });
            });
            return { ...node, isExpanded: true };
          } else {
            return { ...node, isExpanded: false };
          }
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    setRootFiles(updateNode(rootFiles));
  };

  const handleNodeClick = (node: FileNode, e: React.MouseEvent) => {
    // Multi-select logic
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+Click: Toggle selection
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(node.path)) {
        newSelected.delete(node.path);
      } else {
        newSelected.add(node.path);
      }
      setSelectedFiles(newSelected);
      setLastSelected(node.path);
    } else if (e.shiftKey && lastSelected) {
      // Shift+Click: Select range
      const allPaths = getAllVisiblePaths(rootFiles);
      const lastIndex = allPaths.indexOf(lastSelected);
      const currentIndex = allPaths.indexOf(node.path);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = allPaths.slice(start, end + 1);
        setSelectedFiles(new Set(range));
      }
    } else {
      // Regular click
      setSelectedFiles(new Set([node.path]));
      setLastSelected(node.path);

      if (node.isDirectory) {
        toggleDirectory(node.path);
      } else {
        onFileClick(node.path);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the right-clicked item if not already selected
    if (!selectedFiles.has(node.path)) {
      setSelectedFiles(new Set([node.path]));
      setLastSelected(node.path);
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: node.path,
      isDirectory: node.isDirectory
    });
  };

  const getAllVisiblePaths = (nodes: FileNode[]): string[] => {
    const paths: string[] = [];
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        paths.push(node.path);
        if (node.isExpanded && node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return paths;
  };

  const startRename = (path: string) => {
    const fileName = path.split('/').pop() || '';
    setRenamingPath(path);
    setRenameValue(fileName);
    setOriginalRenameValue(fileName); // Store original name
    setContextMenu(null);
  };

  const handleRename = async () => {
    if (!renamingPath) {
      return;
    }

    const newName = renameValue.trim();

    // If empty or unchanged, silently cancel
    if (!newName || newName === originalRenameValue) {
      setRenamingPath(null);
      return;
    }

    try {
      const { proxyFetch } = await import('@/lib/proxy-client');
      const response = await proxyFetch('/rename-file', userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: renamingPath, newName, workspace: workspacePath })
      });

      if (!response.ok) {
        const data = await response.json();
        setToast({ message: data.error || 'Failed to rename', type: 'error' });
        return;
      }

      setToast({ message: 'Renamed successfully', type: 'success' });
      await loadDirectory(workspacePath);
      setRenamingPath(null);
    } catch (error) {
      console.error('Error renaming:', error);
      setToast({ message: 'Failed to rename', type: 'error' });
    }
  };

  const handleDelete = async (path: string) => {
    const fileName = path.split('/').pop();

    setConfirmDialog({
      title: 'Delete File',
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);

        try {
          const { proxyFetch } = await import('@/lib/proxy-client');
          const response = await proxyFetch('/delete-file', userId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: path, workspace: workspacePath })
          });

          if (!response.ok) {
            const data = await response.json();
            setToast({ message: data.error || 'Failed to delete', type: 'error' });
            return;
          }

          setToast({ message: 'Deleted successfully', type: 'success' });
          setSelectedFiles(new Set());
          await loadDirectory(workspacePath);
        } catch (error) {
          console.error('Error deleting:', error);
          setToast({ message: 'Failed to delete', type: 'error' });
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    const fileNames = Array.from(selectedFiles).map(p => p.split('/').pop()).join(', ');

    setConfirmDialog({
      title: `Delete ${selectedFiles.size} item${selectedFiles.size > 1 ? 's' : ''}`,
      message: `Are you sure you want to delete: ${fileNames}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);

        let successCount = 0;
        let errorCount = 0;

        const { proxyFetch } = await import('@/lib/proxy-client');
        for (const path of selectedFiles) {
          try {
            const response = await proxyFetch('/delete-file', userId, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: path, workspace: workspacePath })
            });

            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error('Error deleting:', path, error);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          setToast({ message: `Deleted ${successCount} item${successCount > 1 ? 's' : ''}`, type: 'success' });
        } else {
          setToast({ message: `Deleted ${successCount}, failed to delete ${errorCount}`, type: 'error' });
        }

        setSelectedFiles(new Set());
        await loadDirectory(workspacePath);
      }
    });
  };

  const handleCreateNew = async (parentPath: string, type: 'file' | 'folder') => {
    // TODO: Replace with inline input dialog (conductor.build style)
    const name = prompt(`Enter ${type} name:`);
    if (!name?.trim()) return;

    try {
      const { proxyFetch } = await import('@/lib/proxy-client');
      const response = await proxyFetch('/create-file', userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPath, name: name.trim(), type: type === 'folder' ? 'directory' : 'file', workspace: workspacePath })
      });

      if (!response.ok) {
        const data = await response.json();
        setToast({ message: data.error || 'Failed to create', type: 'error' });
        return;
      }

      setToast({ message: `${type === 'file' ? 'File' : 'Folder'} created`, type: 'success' });
      await loadDirectory(workspacePath);
    } catch (error) {
      console.error('Error creating:', error);
      setToast({ message: 'Failed to create', type: 'error' });
    }
  };

  const handleCut = () => {
    setClipboard({ paths: Array.from(selectedFiles), operation: 'cut' });
    setContextMenu(null);
    setToast({ message: `Cut ${selectedFiles.size} item${selectedFiles.size > 1 ? 's' : ''}`, type: 'info' });
  };

  const handleCopy = () => {
    setClipboard({ paths: Array.from(selectedFiles), operation: 'copy' });
    setContextMenu(null);
    setToast({ message: `Copied ${selectedFiles.size} item${selectedFiles.size > 1 ? 's' : ''}`, type: 'info' });
  };

  const handlePaste = async (targetPath: string) => {
    if (!clipboard) return;

    setContextMenu(null);

    // TODO: Implement paste API endpoint
    setToast({ message: 'Paste functionality coming soon', type: 'info' });
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setContextMenu(null);
    setToast({ message: 'Path copied to clipboard', type: 'success' });
  };

  const handleCopyRelativePath = (path: string) => {
    const relativePath = path.replace(workspacePath + '/', '');
    navigator.clipboard.writeText(relativePath);
    setContextMenu(null);
    setToast({ message: 'Relative path copied to clipboard', type: 'success' });
  };

  const getContextMenuSections = (): ContextMenuSection[] => {
    if (!contextMenu) return [];

    const sections: ContextMenuSection[] = [];

    // Section 1: New File/Folder (only for directories)
    if (contextMenu.isDirectory) {
      sections.push({
        items: [
          { label: 'New File', onClick: () => handleCreateNew(contextMenu.path, 'file') },
          { label: 'New Folder', onClick: () => handleCreateNew(contextMenu.path, 'folder') }
        ]
      });
    }

    // Section 2: Cut, Copy, Paste
    sections.push({
      items: [
        {
          label: 'Cut',
          onClick: handleCut,
          shortcut: '⌘X'
        },
        {
          label: 'Copy',
          onClick: handleCopy,
          shortcut: '⌘C'
        },
        {
          label: 'Paste',
          onClick: () => handlePaste(contextMenu.path),
          disabled: !clipboard,
          shortcut: '⌘V'
        }
      ]
    });

    // Section 3: Copy Path, Copy Relative Path
    sections.push({
      items: [
        { label: 'Copy Path', onClick: () => handleCopyPath(contextMenu.path) },
        { label: 'Copy Relative Path', onClick: () => handleCopyRelativePath(contextMenu.path) }
      ]
    });

    // Section 4: Rename, Delete
    sections.push({
      items: [
        {
          label: 'Rename',
          onClick: () => startRename(contextMenu.path),
          shortcut: 'F2',
          disabled: selectedFiles.size > 1
        },
        {
          label: 'Delete',
          onClick: () => handleDelete(contextMenu.path),
          danger: true,
          shortcut: 'Delete'
        }
      ]
    });

    return sections;
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const indent = depth * 12;
    const isSelected = selectedFiles.has(node.path);
    const isRenaming = renamingPath === node.path;

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-1 px-2 py-1 cursor-pointer text-sm transition-colors"
          style={{
            paddingLeft: `${indent + 8}px`,
            color: 'var(--text)',
            backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.08)' : 'transparent'
          }}
          onClick={(e) => handleNodeClick(node, e)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          onMouseEnter={(e) => {
            if (!isSelected) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          {node.isDirectory ? (
            <>
              {node.isExpanded ? (
                <ChevronDown size={14} style={{ opacity: 0.6 }} />
              ) : (
                <ChevronRight size={14} style={{ opacity: 0.6 }} />
              )}
              <Folder size={14} style={{ opacity: 0.6 }} />
            </>
          ) : (
            <>
              <span style={{ width: '14px' }} />
              <File size={14} style={{ opacity: 0.6 }} />
            </>
          )}

          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                } else if (e.key === 'Escape') {
                  setRenamingPath(null);
                }
              }}
              className="flex-1 px-0 py-0 text-sm outline-none"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{node.name}</span>
          )}
        </div>

        {node.isDirectory && node.isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-3 text-sm" style={{ color: 'var(--text)', opacity: 0.5 }}>
        Loading files...
      </div>
    );
  }

  return (
    <>
      <div ref={explorerRef} className="flex-1 overflow-y-auto thin-scrollbar" style={{ minHeight: 0 }}>
        <div className="p-2">
          <h2 className="text-xs font-semibold mb-2 px-2" style={{ color: 'var(--text)', opacity: 0.6 }}>
            EXPLORER
          </h2>
          {rootFiles.map(node => renderNode(node))}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          sections={getContextMenuSections()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Delete"
          danger={true}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
}
