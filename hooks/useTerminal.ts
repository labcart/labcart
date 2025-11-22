import { useEffect, useRef } from 'react';
import type { ISocket } from './useSocket';

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

      // Request terminal creation from backend
      console.log(`🖥️  Requesting terminal creation: ${terminalId}`);
      socket.emit('terminal:create', {
        terminalId,
        cwd: cwd, // Workspace path from parent component
        cols: term.cols,
        rows: term.rows,
        botId,
      });

      // Handle terminal output from backend
      const handleOutput = (data: { terminalId: string; data: string }) => {
        if (data.terminalId === terminalId) {
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

      // Handle terminal exit
      const handleExit = (data: { terminalId: string; exitCode: number }) => {
        if (data.terminalId === terminalId) {
          console.log(`🖥️  Terminal ${terminalId} exited with code ${data.exitCode}`);
          term.write('\r\n\x1b[31mTerminal exited\x1b[0m\r\n');
        }
      };

      // Handle errors
      const handleError = (data: { terminalId: string; error: string }) => {
        if (data.terminalId === terminalId) {
          console.error(`❌ Terminal ${terminalId} error:`, data.error);
          term.write(`\r\n\x1b[31mError: ${data.error}\x1b[0m\r\n`);
        }
      };

      socket.on('terminal:output', handleOutput);
      socket.on('terminal:created', handleCreated);
      socket.on('terminal:exit', handleExit);
      socket.on('terminal:error', handleError);

      // Send user input to backend
      term.onData((data: string) => {
        socket.emit('terminal:input', { terminalId, data });
      });

      // Handle terminal resize
      const handleResize = () => {
        if (fitAddon) {
          fitAddon.fit();
          socket.emit('terminal:resize', {
            terminalId,
            cols: term.cols,
            rows: term.rows,
          });
        }
      };

      // Resize on window resize
      window.addEventListener('resize', handleResize);

      // Handle page unload - kill terminals on page refresh/close
      // This is different from React component unmount (which happens during navigation)
      const handleBeforeUnload = () => {
        if (socket && socket.connected) {
          // Emit kill event - socket will disconnect and server will clean up
          socket.emit('terminal:kill', { terminalId });
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    };

    initTerminal();

    // Cleanup - DON'T kill terminal during React unmount (it stays alive across app navigations)
    // Terminals are only killed on actual page unload (handled by beforeunload above)
    return () => {
      // No-op during component unmount - terminal persists during app navigation
    };
  }, [terminalId, socket, cwd, botId, onReady]);

  return { terminalRef, terminal: xtermRef.current, fitAddon: fitAddonRef.current };
}
