const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Exposes safe Electron APIs to the renderer process
 * This runs in a secure context with access to Node.js APIs
 */

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  /**
   * Open native folder picker dialog
   * @returns {Promise<string|null>} Selected folder path or null if canceled
   */
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  /**
   * Save workspace preference
   * @param {string} path - Workspace path to save
   * @returns {Promise<boolean>} Success status
   */
  saveWorkspace: (path) => ipcRenderer.invoke('save-workspace', path),

  /**
   * Platform info
   */
  platform: process.platform,

  /**
   * Check if running in Electron
   */
  isElectron: true
});

// Log successful preload
console.log('Electron preload script loaded successfully');
