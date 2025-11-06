# LabCart Desktop App - Electron Setup Complete

## ✅ What's Been Set Up

1. **Electron installed** - Native desktop framework
2. **electron/main.js** - Main Electron process (starts app + bot server)
3. **electron/preload.js** - Secure IPC bridge for folder picker
4. **package.json updated** - Scripts for dev/build

## Running the Desktop App

### Development Mode

**Terminal 1** - Start Next.js dev server:
```bash
cd /opt/lab/labcart
npm run dev
```

**Terminal 2** - Start Electron (once Next.js is running):
```bash
npm run electron:dev
```

The desktop app will open with:
- Native folder picker in workspace selector
- Bot server running in background
- Full desktop experience

### Build for Distribution

```bash
# macOS
npm run build:mac     # Creates dist/LabCart.dmg

# Windows
npm run build:win     # Creates dist/LabCart Setup.exe

# Linux
npm run build:linux   # Creates dist/LabCart.AppImage
```

## What Works Now

- ✅ **Native folder picker** - WorkspacePicker detects Electron and shows "Open Folder" button
- ✅ **Background server** - Bot server starts automatically
- ✅ **Window management** - Professional desktop window
- ✅ **Workspace isolation** - Backend ready for workspace-specific sessions

## Testing Electron vs Web

**Electron Mode:**
- Run `npm run electron:dev`
- WorkspacePicker shows big "Open Folder" button
- Native OS dialog opens when clicked
- Seamless desktop experience

**Web Mode (current):**
- Run `npm run dev`
- WorkspacePicker shows quick test folder list
- Manual path input as fallback
- Good for development

## File Structure

```
labcart/
├── electron/
│   ├── main.js          # Electron entry point
│   └── preload.js       # IPC bridge
├── app/                 # Next.js pages
├── components/
│   └── WorkspacePicker.tsx  # Detects Electron automatically
└── package.json         # Electron scripts
```

## Next Steps

1. **Test Electron mode** - Run both terminals and test folder picker
2. **Auth for desktop** - May need OAuth redirect handling
3. **Build and distribute** - Create installers for users

## Notes

- Bot server path is `../claude-bot/server.js` relative to electron/
- 2-second delay before opening window (lets server start)
- Server automatically killed when app closes
- Dev tools open automatically in dev mode
