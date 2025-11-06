const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let serverProcess;
let mainWindow;

/**
 * Start bot server in background
 */
function startBotServer() {
  const serverPath = path.join(__dirname, '../claude-bot/server.js');

  console.log('Starting bot server from:', serverPath);

  serverProcess = spawn('node', [serverPath], {
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

  // Load application
  if (isDev) {
    // Development: Load Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load static build
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  // Clean up on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App lifecycle: Ready
 */
app.whenReady().then(() => {
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

  // Start backend server
  startBotServer();

  // Wait a moment for server to start
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
  // Kill bot server
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
  if (serverProcess) {
    serverProcess.kill();
  }
});
