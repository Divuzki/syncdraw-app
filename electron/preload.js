const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Studio functionality
  launchStudio: (sessionId, dawType) => ipcRenderer.invoke('launch-studio', sessionId, dawType),
  endSession: (sessionId) => ipcRenderer.invoke('end-session', sessionId),
  getSessionMetadata: (sessionId) => ipcRenderer.invoke('get-session-metadata', sessionId),
  
  // Session management
  getSessions: (userId) => ipcRenderer.invoke('get-sessions', userId),
  createSession: (sessionData) => ipcRenderer.invoke('create-session', sessionData),
  
  // File system operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Theme detection
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  onThemeChange: (callback) => {
    ipcRenderer.on('theme-changed', callback);
    return () => ipcRenderer.removeListener('theme-changed', callback);
  },
  
  // Auto-updater functionality
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Auto-updater events
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    return () => ipcRenderer.removeListener('download-progress', callback);
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  },
});

// Expose safe authentication API
contextBridge.exposeInMainWorld('api', {
  auth: {
    loginWithPopup: (provider) => ipcRenderer.invoke('auth-login-popup', provider),
    logout: () => ipcRenderer.invoke('auth-logout'),
    onAuthStateChanged: (callback) => {
      ipcRenderer.on('auth-state-changed', (event, user) => callback(user));
      return () => ipcRenderer.removeListener('auth-state-changed', callback);
    },
  },
});

// Security: Remove node integration
delete window.require;
delete window.exports;
delete window.module;