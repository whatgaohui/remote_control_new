/**
 * RC-Client GUI - Preload Script
 * Secure bridge between main process and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Connection
  connect: (config) => ipcRenderer.invoke('connect', config),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  getStatus: () => ipcRenderer.invoke('get-status'),

  // Commands
  sendCommand: (type, data) => ipcRenderer.invoke('send-command', { type, data }),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // History
  getConnectionHistory: () => ipcRenderer.invoke('get-connection-history'),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Event listeners
  onConnected: (callback) => {
    ipcRenderer.on('connected', (_, data) => callback(data));
  },
  onDisconnected: (callback) => {
    ipcRenderer.on('disconnected', (_, data) => callback(data));
  },
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (_, data) => callback(data));
  },
  onAuthenticated: (callback) => {
    ipcRenderer.on('authenticated', (_, data) => callback(data));
  },
  onAuthFailed: (callback) => {
    ipcRenderer.on('auth-failed', (_, data) => callback(data));
  },
  onServerMessage: (callback) => {
    ipcRenderer.on('server-message', (_, data) => callback(data));
  },
  onConnectionError: (callback) => {
    ipcRenderer.on('connection-error', (_, data) => callback(data));
  },
  onPong: (callback) => {
    ipcRenderer.on('pong', (_, data) => callback(data));
  },
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (_, data) => callback(data));
  },

  // Cleanup listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
