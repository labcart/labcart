const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;

let serverProcess;
let nextServerProcess;
let mainWindow;

/**
 * Start Next.js server in production
 */
function startNextServer() {
  return new Promise((resolve, reject) => {
    const nodePath = isDev
      ? 'node'
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'node');

    const nextBinPath = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
    const appPath = path.join(__dirname, '..');

    console.log('Starting Next.js server...');
    console.log('Node path:', nodePath);
    console.log('Next bin path:', nextBinPath);
    console.log('App path:', appPath);

    nextServerProcess = spawn(nodePath, [nextBinPath, 'start'], {
      cwd: appPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000'
      },
      stdio: 'pipe'
    });

    nextServerProcess.stdout.on('data', (data) => {
      console.log('[Next.js]', data.toString());
      if (data.toString().includes('Ready') || data.toString().includes('started')) {
        resolve();
      }
    });

    nextServerProcess.stderr.on('data', (data) => {
      console.error('[Next.js Error]', data.toString());
    });

    nextServerProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    nextServerProcess.on('exit', (code) => {
      console.log(`Next.js server exited with code ${code}`);
    });

    // Timeout after 30 seconds
    setTimeout(() => resolve(), 30000);
  });
}

/**
 * Start bot server in background
 */
function startBotServer() {
  const serverPath = path.join(__dirname, '../claude-bot/server.js');
  const nodePath = isDev
    ? 'node'
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'node');

  console.log('Starting bot server from:', serverPath);

  serverProcess = spawn(nodePath, [serverPath], {
    cwd: path.join(__dirname, '../claude-bot'),
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_MODE: 'true' }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start bot server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Bot server exited with code ${code}`);
  });
}

/**
 * Create main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'LabCart',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    backgroundColor: '#f6f6f5',
    show: false // Don't show until ready
  });

  // Show window when ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load application - always from Next.js server
  mainWindow.loadURL('http://localhost:3000');

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Clean up on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App lifecycle: Ready
 */
app.whenReady().then(async () => {
  console.log('LabCart Desktop starting...');

  // Register IPC handlers
  ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Workspace Folder',
      buttonLabel: 'Select Workspace'
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('save-workspace', async (event, workspacePath) => {
    // TODO: Persist workspace preference to local storage/config file
    console.log('Workspace selected:', workspacePath);
    return true;
  });

  // In production, start Next.js server first
  if (!isDev) {
    console.log('Starting Next.js server in production mode...');
    try {
      await startNextServer();
      console.log('Next.js server started successfully');
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
    }
  }

  // Start bot server
  startBotServer();

  // Wait a moment for servers to stabilize
  setTimeout(() => {
    createWindow();
  }, 2000);

  // macOS: Re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * App lifecycle: All windows closed
 */
app.on('window-all-closed', () => {
  // Kill servers
  if (nextServerProcess) {
    console.log('Shutting down Next.js server...');
    nextServerProcess.kill();
  }
  if (serverProcess) {
    console.log('Shutting down bot server...');
    serverProcess.kill();
  }

  // Quit on all platforms (including macOS)
  app.quit();
});

/**
 * App lifecycle: Before quit
 */
app.on('before-quit', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
  if (serverProcess) {
    serverProcess.kill();
  }
});
