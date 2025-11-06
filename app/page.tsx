'use client';

import { useState, useEffect } from 'react';
import LeftSidebar from "@/components/LeftSidebar";
import WorkspacePanel from "@/components/WorkspacePanel";
import RightSidebar from "@/components/RightSidebar";
import WorkspacePicker from "@/components/WorkspacePicker";
import { BotProvider } from "@/contexts/BotContext";
import useTabStore from "@/store/tabStore";
import useWorkspaceStore from "@/store/workspaceStore";

export default function Home() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const { validateTabs, userId, tabs, addFileTab, initializeDefaultTab, setWorkspacePath: setTabStoreWorkspace } = useTabStore();
  const { isFirstRun, workspacePath, setWorkspacePath } = useWorkspaceStore();

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

  const handleWorkspaceSelected = (path: string) => {
    setWorkspacePath(path);
    setTabStoreWorkspace(path);
    console.log('✅ Workspace selected:', path);
  };

  const handleHomeClick = () => {
    // Trigger workspace picker by setting isFirstRun to true temporarily
    useWorkspaceStore.setState({ isFirstRun: true });
  };

  return (
    <BotProvider>
      {/* Show workspace picker on first run or when home button clicked */}
      {isFirstRun && (
        <WorkspacePicker onWorkspaceSelected={handleWorkspaceSelected} />
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
