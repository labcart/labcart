'use client';

import { useState } from 'react';
import LeftSidebar from "@/components/LeftSidebar";
import ChatWindow from "@/components/ChatWindow";
import RightSidebar from "@/components/RightSidebar";
import { PanelLeft, PanelRight } from 'lucide-react';

export default function Home() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      {showLeftSidebar && <LeftSidebar />}
      <ChatWindow />

      {/* Right Side Container - Always Present */}
      <div className="flex flex-col" style={{ backgroundColor: 'var(--sidebar-bg)', borderLeft: '1px solid var(--border)' }}>
        {/* Toggle Buttons Bar - Always Visible */}
        <div className="flex items-center justify-end gap-1 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
            title={showLeftSidebar ? "Hide Left Sidebar" : "Show Left Sidebar"}
          >
            <PanelLeft size={18} style={{ color: 'var(--text)', opacity: showLeftSidebar ? 1 : 0.3 }} />
          </button>
          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 cursor-pointer"
            title={showRightSidebar ? "Hide Right Sidebar" : "Show Right Sidebar"}
          >
            <PanelRight size={18} style={{ color: 'var(--text)', opacity: showRightSidebar ? 1 : 0.3 }} />
          </button>
        </div>

        {/* Sidebar Content - Conditionally Rendered */}
        {showRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
}
