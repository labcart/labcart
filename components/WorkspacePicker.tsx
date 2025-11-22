'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Github, Loader2, AlertCircle, FolderGit2 } from 'lucide-react';
import useTabStore from '@/store/tabStore';

interface WorkspacePickerProps {
  onWorkspaceSelected: (path: string) => void;
}

interface Workspace {
  name: string;
  path: string;
  isGitRepo: boolean;
  lastModified: string;
}

/**
 * WorkspacePicker - Cloud IDE workspace selector
 *
 * Two modes:
 * 1. Existing Projects - Browse ~/labcart-projects/ on the VPS
 * 2. Clone Repo - Clone a GitHub repo to the VPS
 *
 * This component works for REMOTE VPS installations. For local installations,
 * the bot server should be running on localhost.
 */
export default function WorkspacePicker({ onWorkspaceSelected }: WorkspacePickerProps) {
  const { userId, botServerUrl } = useTabStore();
  const [activeTab, setActiveTab] = useState<'existing' | 'clone'>('existing');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState('');
  const [cloning, setCloning] = useState(false);

  // Fetch existing workspaces on mount
  useEffect(() => {
    if (activeTab === 'existing') {
      fetchWorkspaces();
    }
  }, [activeTab, botServerUrl]);

  const fetchWorkspaces = async () => {
    if (!botServerUrl) {
      setError('Bot server not connected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${botServerUrl}/list-workspaces`);

      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch (err: any) {
      console.error('Error fetching workspaces:', err);
      setError(err.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    console.log(`📂 Selected workspace: ${workspace.name}`);
    onWorkspaceSelected(workspace.path);
  };

  const handleCloneRepo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    if (!botServerUrl) {
      setError('Bot server not connected');
      return;
    }

    setCloning(true);
    setError('');

    try {
      const response = await fetch(`${botServerUrl}/clone-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to clone repository');
      }

      console.log(`✅ Successfully cloned: ${data.name}`);

      // Open the newly cloned workspace
      onWorkspaceSelected(data.path);

    } catch (err: any) {
      console.error('Error cloning repository:', err);
      setError(err.message || 'Failed to clone repository');
    } finally {
      setCloning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: '#f6f6f5' }}
    >
      {/* Welcome Card */}
      <div
        className="w-full max-w-2xl mx-4"
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
            Select Workspace
          </h2>
          <p className="text-sm mt-1" style={{ color: '#7a7875' }}>
            Choose an existing project or clone a new repository
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#e0e0e0' }}>
          <button
            onClick={() => setActiveTab('existing')}
            className="flex-1 px-6 py-3 font-medium text-sm transition-colors"
            style={{
              color: activeTab === 'existing' ? '#2c2826' : '#7a7875',
              borderBottom: activeTab === 'existing' ? '2px solid #2c2826' : '2px solid transparent',
            }}
          >
            Existing Projects
          </button>
          <button
            onClick={() => setActiveTab('clone')}
            className="flex-1 px-6 py-3 font-medium text-sm transition-colors"
            style={{
              color: activeTab === 'clone' ? '#2c2826' : '#7a7875',
              borderBottom: activeTab === 'clone' ? '2px solid #2c2826' : '2px solid transparent',
            }}
          >
            Clone Repository
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
            <AlertCircle size={16} style={{ color: '#856404', marginTop: '2px' }} />
            <span className="text-sm" style={{ color: '#856404' }}>
              {error}
            </span>
          </div>
        )}

        {/* Tab Content */}
        <div className="px-6 py-6" style={{ minHeight: '300px' }}>
          {activeTab === 'existing' ? (
            /* Existing Projects Tab */
            <div className="space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin mb-3" size={32} style={{ color: '#7a7875' }} />
                  <p className="text-sm" style={{ color: '#7a7875' }}>Loading workspaces...</p>
                </div>
              ) : workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FolderOpen size={48} style={{ color: '#d0d0d0', marginBottom: '12px' }} />
                  <p className="text-sm font-medium" style={{ color: '#2c2826' }}>No workspaces found</p>
                  <p className="text-sm mt-1" style={{ color: '#7a7875' }}>Clone a repository to get started</p>
                </div>
              ) : (
                <>
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.path}
                      onClick={() => handleSelectWorkspace(workspace)}
                      className="w-full p-4 rounded-lg flex items-center gap-3 transition-all"
                      style={{
                        backgroundColor: '#f6f6f5',
                        border: '1px solid #e0e0e0',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ebebea';
                        e.currentTarget.style.borderColor = '#d0d0d0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f6f6f5';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                      }}
                    >
                      {workspace.isGitRepo ? (
                        <FolderGit2 size={20} style={{ color: '#7a7875' }} />
                      ) : (
                        <FolderOpen size={20} style={{ color: '#7a7875' }} />
                      )}
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm" style={{ color: '#2c2826' }}>
                          {workspace.name}
                        </div>
                        <div className="font-mono text-xs mt-0.5" style={{ color: '#7a7875' }}>
                          {workspace.path}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* Clone Repository Tab */
            <form onSubmit={handleCloneRepo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#2c2826' }}>
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <Github
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    size={18}
                    style={{ color: '#7a7875' }}
                  />
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full pl-10 pr-4 py-3 rounded-lg font-mono text-sm"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e0e0e0',
                      color: '#2c2826',
                    }}
                    disabled={cloning}
                    autoFocus
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: '#7a7875' }}>
                  The repository will be cloned to ~/labcart-projects/ on your server
                </p>
              </div>

              <button
                type="submit"
                disabled={cloning || !repoUrl.trim()}
                className="w-full px-6 py-3 rounded-lg flex items-center justify-center gap-3 transition-all duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#2c2826',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  if (!cloning && repoUrl.trim()) {
                    e.currentTarget.style.backgroundColor = '#454340';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2c2826';
                }}
              >
                {cloning ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Cloning Repository...</span>
                  </>
                ) : (
                  <>
                    <Github size={20} />
                    <span>Clone & Open</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
