'use client';

import { useState, useEffect } from 'react';
import LeftSidebar from "@/components/LeftSidebar";
import ChatWindow from "@/components/ChatWindow";
import RightSidebar from "@/components/RightSidebar";
import { BotProvider } from "@/contexts/BotContext";
import useTabStore from "@/store/tabStore";

export default function Home() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const { validateTabs, userId, tabs } = useTabStore();

  // Validate persisted tabs against backend on mount
  useEffect(() => {
    // Only run validation if we have a userId and tabs from localStorage
    if (userId && tabs.length > 0) {
      console.log('🔍 Validating persisted tabs against backend...');
      validateTabs();
    }
  }, []); // Empty deps = run once on mount

  return (
    <BotProvider>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
        {showLeftSidebar && <LeftSidebar />}

        <ChatWindow />

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
