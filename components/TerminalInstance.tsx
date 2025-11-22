'use client';

import type { ISocket } from '@/hooks/useSocket';
import { useTerminal } from '@/hooks/useTerminal';

interface TerminalInstanceProps {
  terminalId: string;
  socket: ISocket | null;
  cwd: string;
  isActive: boolean;
}

export default function TerminalInstance({ terminalId, socket, cwd, isActive }: TerminalInstanceProps) {
  const { terminalRef } = useTerminal({
    terminalId,
    socket,
    cwd,
    onReady: () => console.log(`Terminal ${terminalId} ready`)
  });

  return (
    <div
      ref={terminalRef}
      className="w-full h-full"
      style={{
        padding: '6px 8px',
        display: isActive ? 'block' : 'none'
      }}
    />
  );
}
