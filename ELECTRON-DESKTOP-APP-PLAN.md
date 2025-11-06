# LabCart Desktop App - Electron Implementation Plan

**Date:** 2025-11-05
**Status:** Frontend Ready, Electron Setup Pending

## Current Status

### ✅ Completed (Web Version)
- [x] Workspace picker UI with manual path input
- [x] Home button wired to show workspace picker
- [x] Supabase GitHub authentication
- [x] Backend workspace isolation (sessions, history)
- [x] Auto-search for conversations across workspaces
- [x] Workspace state management (zustand store)

### 🔄 In Progress
- [ ] Electron wrapper setup
- [ ] Native folder picker integration
- [ ] Desktop app packaging

### 📋 TODO
- [ ] Compile to native app (.dmg, .exe, .AppImage)
- [ ] Test Electron build process
- [ ] Update auth flow for desktop (OAuth redirect handling)

## Architecture

```
labcart-desktop/
├── electron/
│   ├── main.js           # Electron entry, spawns server.js
│   ├── preload.js        # IPC bridge for folder picker
│   └── server-manager.js # Background server process
├── app/                  # Next.js frontend (existing)
├── components/           # React components (existing)
├── server.js             # Bot server backend (in claude-bot/)
└── package.json          # Scripts for dev/build
```

## User Flow

1. **Launch App** → Electron window opens
2. **Authentication** → Supabase GitHub login
3. **Workspace Selection** → Native folder picker (Electron) or manual input (Web)
4. **Main Interface** → Chat with bots, workspace-locked sessions
5. **Home Button** → Returns to workspace selector

## Workspace Picker

**File:** `/opt/lab/labcart/components/WorkspacePicker.tsx`

**Two Modes:**
- **Electron**: Native OS folder dialog via `window.electron.selectFolder()`
- **Web Fallback**: Manual path input field

**Detection:**
```typescript
const isElectron = typeof window !== 'undefined' &&
                   (window as any).electron !== undefined;
```

## Electron Setup (To Be Created)

### 1. Install Dependencies
```bash
npm install --save-dev electron electron-builder
npm install --save-dev @types/electron
```

### 2. Create `electron/main.js`
```javascript
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess;
let mainWindow;

// Start bot server in background
function startBotServer() {
  const serverPath = path.join(__dirname, '../claude-bot/server.js');
  serverProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '../claude-bot'),
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start bot server:', err);
  });
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // In dev: Load Next.js dev server
  // In prod: Load static build
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../app/out/index.html'));
  }
}

// Folder picker IPC handler
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  return result.canceled ? null : result.filePaths[0];
});

// App lifecycle
app.whenReady().then(() => {
  startBotServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});
```

### 3. Create `electron/preload.js`
```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe API to frontend
contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder')
});
```

### 4. Update `package.json`
```json
{
  "name": "labcart",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "electron:dev": "electron .",
    "electron:build": "electron-builder",
    "build:mac": "npm run build && electron-builder --mac",
    "build:win": "npm run build && electron-builder --win",
    "build:linux": "npm run build && electron-builder --linux"
  },
  "build": {
    "appId": "com.labcart.app",
    "productName": "LabCart",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "app/out/**/*",
      "claude-bot/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "target": "dmg",
      "icon": "public/icon.icns"
    },
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/icon.png"
    }
  }
}
```

## Frontend Changes Made Today

### WorkspacePicker.tsx
- **Removed**: Hardcoded test directory list
- **Added**: Electron detection
- **Added**: Native folder picker button (Electron mode)
- **Added**: Manual path input (Web mode)
- **API**: Calls `window.electron.selectFolder()` when in Electron

### page.tsx (Main)
- **Existing**: Home button triggers workspace picker
- **Existing**: First run shows workspace picker
- **No changes needed**

## Backend (Already Complete)

### server.js
- ✅ `/all-sessions?workspace=/path` - List sessions by workspace
- ✅ `/messages/:uuid?workspace=/path` - Load messages with workspace
- ✅ WebSocket `send-message` - Saves workspace to session metadata
- ✅ Auto-search across workspaces when no workspace specified

### bot-manager.js
- ✅ `readSessionMessages()` - Auto-searches workspaces if no path provided
- ✅ Telegram bots pass workspace from `bots.json` config

## Next Steps

1. **Install Electron dependencies**
   ```bash
   cd /opt/lab/labcart
   npm install --save-dev electron electron-builder @types/electron
   ```

2. **Create Electron files**
   - `electron/main.js`
   - `electron/preload.js`

3. **Test Electron mode**
   ```bash
   npm run electron:dev
   ```

4. **Build desktop app**
   ```bash
   npm run build:mac   # macOS
   npm run build:win   # Windows
   npm run build:linux # Linux
   ```

## OAuth Redirect for Desktop

**Challenge**: GitHub OAuth redirects to `http://localhost:3000/auth/callback`

**Solution**:
- Register custom protocol: `labcart://auth/callback`
- Or use localhost redirect with deep link handling
- Electron captures redirect and passes tokens to app

## Distribution

**Outputs:**
- **macOS**: `dist/LabCart.dmg` (drag-to-install)
- **Windows**: `dist/LabCart Setup.exe` (installer)
- **Linux**: `dist/LabCart.AppImage` (portable)

**Code Signing** (future):
- macOS: Apple Developer certificate
- Windows: Authenticode certificate
- Auto-updates via `electron-updater`

## Current Testing (Web Mode)

You can test the workspace picker right now in web mode:

1. Navigate to homepage
2. Click home button
3. Manually enter workspace path (e.g., `/opt/lab`)
4. Chat should load sessions from that workspace

**Test it with curl:**
```bash
curl "http://localhost:3010/all-sessions?workspace=/opt/lab"
```
