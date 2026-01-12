import { useEffect, useRef, useCallback } from 'react';
import type { ISocket } from './useSocket';

// Debounce helper to prevent rapid resize calls causing canvas oscillation
const debounce = <T extends (...args: any[]) => void>(fn: T, ms: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

interface UseTerminalOptions {
  terminalId: string;
  socket: ISocket | null;
  cwd?: string;
  botId?: string;
  onReady?: () => void;
}

export function useTerminal(options: UseTerminalOptions) {
  const { terminalId, socket, cwd, botId, onReady } = options;

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const createdRef = useRef(false);
  const mountedRef = useRef(false);
  const handlersRef = useRef<{
    output: Function | null;
    created: Function | null;
    reattached: Function | null;
    exit: Function | null;
    error: Function | null;
    reconnect: Function | null;
    disconnect: Function | null;
  }>({
    output: null,
    created: null,
    reattached: null,
    exit: null,
    error: null,
    reconnect: null,
    disconnect: null,
  });

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    // Prevent double creation in React StrictMode
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Only run in browser
    if (typeof window === 'undefined') return;

    // Dynamic imports to avoid SSR issues
    let term: any;
    let fitAddon: any;
    let webLinksAddon: any;
    let cleanupFns: Array<() => void> = [];

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');
      // @ts-ignore - CSS import for xterm
      await import('@xterm/xterm/css/xterm.css');

      // Get CSS variables for terminal theme
      const getCSSVar = (varName: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

      // Create terminal instance with theme from CSS variables
      term = new Terminal({
        fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: getCSSVar('--terminal-background'),
          foreground: getCSSVar('--terminal-foreground'),
          cursor: getCSSVar('--terminal-cursor'),
          cursorAccent: getCSSVar('--terminal-background'),
          selectionBackground: getCSSVar('--terminal-selection'),
          black: getCSSVar('--terminal-black'),
          red: getCSSVar('--terminal-red'),
          green: getCSSVar('--terminal-green'),
          yellow: getCSSVar('--terminal-yellow'),
          blue: getCSSVar('--terminal-blue'),
          magenta: getCSSVar('--terminal-magenta'),
          cyan: getCSSVar('--terminal-cyan'),
          white: getCSSVar('--terminal-white'),
          brightBlack: getCSSVar('--terminal-bright-black'),
          brightRed: getCSSVar('--terminal-bright-red'),
          brightGreen: getCSSVar('--terminal-bright-green'),
          brightYellow: getCSSVar('--terminal-bright-yellow'),
          brightBlue: getCSSVar('--terminal-bright-blue'),
          brightMagenta: getCSSVar('--terminal-bright-magenta'),
          brightCyan: getCSSVar('--terminal-bright-cyan'),
          brightWhite: getCSSVar('--terminal-bright-white'),
        },
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
      });

      // Add addons
      fitAddon = new FitAddon();
      webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      // Open terminal in DOM
      if (!terminalRef.current) return;
      term.open(terminalRef.current);
      fitAddon.fit();

      // Store refs
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // === SET UP HANDLERS BEFORE EMITTING terminal:create ===
      // This fixes the race condition where early output was missed

      // Handle terminal output from backend
      const handleOutput = (data: { terminalId: string; data: string }) => {
        if (data.terminalId === terminalId && term) {
          term.write(data.data);
        }
      };

      // Handle terminal created confirmation
      const handleCreated = (data: { terminalId: string }) => {
        if (data.terminalId === terminalId) {
          console.log(`✅ Terminal ${terminalId} created`);
          createdRef.current = true;
          if (onReady) onReady();
        }
      };

      // Handle terminal reattached confirmation (after reconnection)
      const handleReattached = (data: { terminalId: string }) => {
        if (data.terminalId === terminalId) {
          console.log(`✅ Terminal ${terminalId} reattached`);
          createdRef.current = true;
        }
      };

      // Handle terminal exit
      const handleExit = (data: { terminalId: string; exitCode: number }) => {
        if (data.terminalId === terminalId && term) {
          console.log(`🖥️  Terminal ${terminalId} exited with code ${data.exitCode}`);
          term.write('\r\n\x1b[31mTerminal exited\x1b[0m\r\n');
          createdRef.current = false;
        }
      };

      // Handle errors
      const handleError = (data: { terminalId: string; error: string }) => {
        if (data.terminalId === terminalId && term) {
          console.error(`❌ Terminal ${terminalId} error:`, data.error);
          term.write(`\r\n\x1b[31mError: ${data.error}\x1b[0m\r\n`);
        }
      };

      // Handle socket disconnection - show warning in terminal
      const handleDisconnect = () => {
        if (term) {
          term.write('\r\n\x1b[33m⚠ Connection lost. Reconnecting...\x1b[0m\r\n');
        }
      };

      // Handle socket reconnection - re-attach to terminal
      const handleReconnect = () => {
        if (term) {
          term.write('\r\n\x1b[32m✓ Reconnected\x1b[0m\r\n');
          // Re-attach to existing terminal on backend (or create if gone)
          console.log(`🔄 Re-attaching to terminal ${terminalId}`);
          socket.emit('terminal:reattach', {
            terminalId,
            cwd: cwd,
            cols: term.cols,
            rows: term.rows,
            botId,
          });
        }
      };

      // Store handler refs for cleanup
      handlersRef.current = {
        output: handleOutput,
        created: handleCreated,
        reattached: handleReattached,
        exit: handleExit,
        error: handleError,
        reconnect: handleReconnect,
        disconnect: handleDisconnect,
      };

      // Register all handlers FIRST
      socket.on('terminal:output', handleOutput);
      socket.on('terminal:created', handleCreated);
      socket.on('terminal:reattached', handleReattached);
      socket.on('terminal:exit', handleExit);
      socket.on('terminal:error', handleError);
      socket.on('disconnect', handleDisconnect);
      socket.on('reconnect', handleReconnect);

      // NOW request terminal creation (handlers are ready to receive output)
      console.log(`🖥️  Requesting terminal creation: ${terminalId}`);
      socket.emit('terminal:create', {
        terminalId,
        cwd: cwd,
        cols: term.cols,
        rows: term.rows,
        botId,
      });

      // Send user input to backend
      term.onData((data: string) => {
        socket.emit('terminal:input', { terminalId, data });
      });

      // Handle terminal resize (debounced to prevent canvas oscillation)
      const handleResize = debounce(() => {
        if (fitAddon && term) {
          fitAddon.fit();
          socket.emit('terminal:resize', {
            terminalId,
            cols: term.cols,
            rows: term.rows,
          });
        }
      }, 100);

      // Resize on window resize
      window.addEventListener('resize', handleResize);
      cleanupFns.push(() => window.removeEventListener('resize', handleResize));

      // Handle page unload - kill terminals on page refresh/close
      const handleBeforeUnload = () => {
        if (socket && socket.connected) {
          socket.emit('terminal:kill', { terminalId });
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      cleanupFns.push(() => window.removeEventListener('beforeunload', handleBeforeUnload));
    };

    initTerminal();

    // Cleanup on unmount
    return () => {
      cleanupFns.forEach(fn => fn());

      // Remove socket handlers
      if (socket && handlersRef.current.output) {
        socket.off('terminal:output', handlersRef.current.output);
        socket.off('terminal:created', handlersRef.current.created!);
        socket.off('terminal:reattached', handlersRef.current.reattached!);
        socket.off('terminal:exit', handlersRef.current.exit!);
        socket.off('terminal:error', handlersRef.current.error!);
        socket.off('disconnect', handlersRef.current.disconnect!);
        socket.off('reconnect', handlersRef.current.reconnect!);
      }
    };
  }, [terminalId, socket, cwd, botId, onReady]);

  return { terminalRef, terminal: xtermRef.current, fitAddon: fitAddonRef.current };
}
