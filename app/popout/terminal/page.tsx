'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useTabStore from '@/store/tabStore';
import { useSocket } from '@/hooks/useSocket';
import TerminalInstance from '@/components/TerminalInstance';

function PopoutTerminalContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  // Get params from URL
  const terminalId = searchParams.get('terminalId') || `popout-${Date.now()}`;
  const cwd = searchParams.get('cwd') || '/';
  const userId = searchParams.get('userId');

  // Initialize userId in store before socket connects
  useEffect(() => {
    if (userId) {
      useTabStore.getState().setUserId(userId);
      setReady(true);
    }
  }, [userId]);

  // Get socket (will connect once userId is set)
  const socket = useSocket();

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e] text-white">
        <p>Missing userId parameter</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e] text-white">
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#1e1e1e] flex flex-col">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <span className="text-xs font-semibold text-[#cccccc]">TERMINAL</span>
        <span className="text-xs text-[#858585]">{cwd}</span>
      </div>

      {/* Terminal fills the rest */}
      <div className="flex-1 overflow-hidden">
        <TerminalInstance
          terminalId={terminalId}
          socket={socket}
          cwd={cwd}
          isActive={true}
        />
      </div>
    </div>
  );
}

export default function PopoutTerminal() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e] text-white">
        <p>Loading...</p>
      </div>
    }>
      <PopoutTerminalContent />
    </Suspense>
  );
}
