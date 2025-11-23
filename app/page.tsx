'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LeftSidebar from "@/components/LeftSidebar";
import WorkspacePanel from "@/components/WorkspacePanel";
import RightSidebar from "@/components/RightSidebar";
import WorkspacePicker from "@/components/WorkspacePicker";
import { BotProvider } from "@/contexts/BotContext";
import useTabStore from "@/store/tabStore";
import useWorkspaceStore from "@/store/workspaceStore";

export default function Home() {
  const router = useRouter();
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { validateTabs, userId, tabs, addFileTab, initializeDefaultTab, setWorkspacePath: setTabStoreWorkspace, setBotServerUrl } = useTabStore();
  const { isFirstRun, workspacePath, setWorkspacePath } = useWorkspaceStore();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);

        // Fetch user's bot servers and set the URL
        await fetchBotServerUrl(session.access_token);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
        // Fetch bot server URL on auth change
        await fetchBotServerUrl(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch user's bot server URL
  const fetchBotServerUrl = async (token?: string) => {
    try {
      // Get token from session if not provided
      let authToken = token;
      if (!authToken) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('⚠️ No auth session, cannot fetch bot server URL');
          return;
        }
        authToken = session.access_token;
      }

      const { apiFetch } = await import('@/lib/api-client');
      const response = await apiFetch('/api/servers', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Find first online server
        const onlineServer = data.servers?.find((s: any) => s.status === 'online');

        if (onlineServer && onlineServer.server_url) {
          console.log(`🔧 Setting bot server URL from registration: ${onlineServer.server_url}`);
          setBotServerUrl(onlineServer.server_url);
          return onlineServer.server_url;
        } else {
          console.log('⚠️ No online bot servers found, using localhost:3010');
        }
      }
    } catch (error) {
      console.error('Error fetching bot server URL:', error);
    }
  };

  // Initialize default tab and validate persisted tabs on mount
  useEffect(() => {
    // Sync workspace path to tabStore
    if (workspacePath) {
      setTabStoreWorkspace(workspacePath);
    }

    // Initialize default untitled file if no tabs exist
    initializeDefaultTab();

    // Validate persisted tabs against backend if we have a userId and tabs
    if (userId && tabs.length > 0) {
      console.log('🔍 Validating persisted tabs against backend...');
      validateTabs();
    }
  }, [workspacePath]); // Re-run when workspace changes

  const handleFileOpen = (filePath: string) => {
    console.log('Opening file:', filePath);
    addFileTab(filePath);
  };

  const handleWorkspaceSelected = async (path: string) => {
    try {
      // Call bot server to identify or create workspace
      const botUrl = useTabStore.getState().botServerUrl;
      if (!botUrl) {
        console.warn('⚠️ No bot server URL, setting workspace path only');
        setWorkspacePath(path);
        setTabStoreWorkspace(path);
        return;
      }

      const response = await fetch(`${botUrl}/workspace/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: path }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store both path and ID
        useWorkspaceStore.getState().setWorkspace(path, data.workspaceId);
        setTabStoreWorkspace(path);
        console.log('✅ Workspace identified:', { path, id: data.workspaceId, isNew: data.isNew });
      } else {
        console.error('Failed to identify workspace:', data);
        // Fallback: just set the path
        setWorkspacePath(path);
        setTabStoreWorkspace(path);
      }
    } catch (error) {
      console.error('Error identifying workspace:', error);
      // Fallback: just set the path
      setWorkspacePath(path);
      setTabStoreWorkspace(path);
    }
  };

  const handleHomeClick = () => {
    // Trigger workspace picker by setting isFirstRun to true temporarily
    useWorkspaceStore.setState({ isFirstRun: true });
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ color: 'var(--text)' }}>Loading...</div>
      </div>
    );
  }

  // Don't render IDE if not authenticated (will redirect to login)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <BotProvider>
      {/* Show workspace picker on first run OR when no workspace is set */}
      {(isFirstRun || !workspacePath) && (
        <WorkspacePicker
          onWorkspaceSelected={handleWorkspaceSelected}
          onRefreshServerUrl={fetchBotServerUrl}
        />
      )}

      <div className="flex h-screen overflow-x-auto overflow-y-hidden" style={{ backgroundColor: 'var(--background)' }}>
        {showLeftSidebar && <LeftSidebar onFileOpen={handleFileOpen} onHomeClick={handleHomeClick} />}

        {/* Unified workspace panel handles both chat and file tabs */}
        <WorkspacePanel />

        {/* Right sidebar area - always show toggle buttons, conditionally show full sidebar */}
        <div style={{ backgroundColor: 'var(--sidebar-bg)', borderLeft: '1px solid var(--border)' }}>
          <RightSidebar
            showLeftSidebar={showLeftSidebar}
            showRightSidebar={showRightSidebar}
            onToggleLeftSidebar={() => setShowLeftSidebar(!showLeftSidebar)}
            onToggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)}
          />
        </div>
      </div>
    </BotProvider>
  );
}
