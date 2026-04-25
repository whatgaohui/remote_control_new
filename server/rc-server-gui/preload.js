/**
 * RC-Server GUI - Preload Script
 * 安全的 IPC 桥接
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 服务器控制
  startServer: (config) => ipcRenderer.invoke('start-server', config),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-status'),

  // 客户端管理
  getClients: () => ipcRenderer.invoke('get-clients'),
  disconnectClient: (id) => ipcRenderer.invoke('disconnect-client', id),

  // 日志
  getLogs: (filter) => ipcRenderer.invoke('get-logs', filter),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),

  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // 系统信息
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // 事件监听
  onLogAdded: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('log-added', handler);
    return () => ipcRenderer.removeListener('log-added', handler);
  },
  onClientConnected: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('client-connected', handler);
    return () => ipcRenderer.removeListener('client-connected', handler);
  },
  onClientDisconnected: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('client-disconnected', handler);
    return () => ipcRenderer.removeListener('client-disconnected', handler);
  },
});
