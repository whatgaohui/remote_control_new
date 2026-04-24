import { create } from 'zustand';
import { toast } from 'sonner';
import type { TabId, Device, AddDeviceInput, FileInfo, ProcessInfo, SystemInfo, OperationLog, FileTransfer } from './types';

interface RemoteState {
  activeTab: TabId;
  isConnected: boolean;
  connectedDevice: Device | null;
  devices: Device[];
  files: FileInfo[];
  currentPath: string;
  processes: ProcessInfo[];
  systemInfo: SystemInfo | null;
  operationLogs: OperationLog[];
  fileTransfers: FileTransfer[];
  clipboardItems: string[];
  latency: number;
  latencyHistory: number[];
  connectStartTime: number | null;
  isScreenSharing: boolean;
  isAudioStreaming: boolean;
  audioVolume: number;
  terminalHistory: string[];
  notifications: { id: string; message: string; time: string; read: boolean }[];
  sidebarCollapsed: boolean;
  fileSearch: string;
  processSearch: string;
  processSortBy: 'cpu' | 'memory' | 'name';
  logCategoryFilter: string;
}

interface RemoteActions {
  setActiveTab: (tab: TabId) => void;
  connect: (device: Device) => Promise<void>;
  disconnect: () => Promise<void>;
  fetchDevices: () => Promise<void>;
  addDevice: (input: AddDeviceInput) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  fetchFiles: (path?: string) => Promise<void>;
  setCurrentPath: (path: string) => void;
  fetchProcesses: () => Promise<void>;
  fetchSystemInfo: () => Promise<void>;
  fetchOperationLogs: () => Promise<void>;
  fetchFileTransfers: () => Promise<void>;
  addClipboardItem: (item: string) => void;
  removeClipboardItem: (index: number) => void;
  toggleScreenSharing: () => Promise<void>;
  toggleAudioStreaming: () => Promise<void>;
  setAudioVolume: (volume: number) => void;
  addTerminalCommand: (cmd: string) => void;
  toggleSidebar: () => void;
  setFileSearch: (search: string) => void;
  setProcessSearch: (search: string) => void;
  setProcessSortBy: (sortBy: 'cpu' | 'memory' | 'name') => void;
  setLogCategoryFilter: (filter: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  startLatencyMonitor: () => void;
  stopLatencyMonitor: () => void;
}

const mockFiles: FileInfo[] = [
  { name: '桌面', type: 'folder', size: 0, modified: '2024-12-15 10:30', path: 'C:\\Users\\Admin\\桌面' },
  { name: '文档', type: 'folder', size: 0, modified: '2024-12-14 16:20', path: 'C:\\Users\\Admin\\文档' },
  { name: '下载', type: 'folder', size: 0, modified: '2024-12-15 08:45', path: 'C:\\Users\\Admin\\下载' },
  { name: '图片', type: 'folder', size: 0, modified: '2024-12-13 14:10', path: 'C:\\Users\\Admin\\图片' },
  { name: '音乐', type: 'folder', size: 0, modified: '2024-12-10 09:00', path: 'C:\\Users\\Admin\\音乐' },
  { name: '视频', type: 'folder', size: 0, modified: '2024-12-08 12:30', path: 'C:\\Users\\Admin\\视频' },
  { name: 'readme.txt', type: 'file', size: 2048, modified: '2024-12-15 09:15', path: 'C:\\Users\\Admin\\readme.txt' },
  { name: 'config.json', type: 'file', size: 512, modified: '2024-12-14 17:00', path: 'C:\\Users\\Admin\\config.json' },
  { name: 'app.exe', type: 'file', size: 15728640, modified: '2024-12-12 11:30', path: 'C:\\Users\\Admin\\app.exe' },
  { name: 'data.xlsx', type: 'file', size: 327680, modified: '2024-12-11 15:45', path: 'C:\\Users\\Admin\\data.xlsx' },
];

const mockProcesses: ProcessInfo[] = [
  { pid: 4, name: 'System', cpuUsage: 0.1, memoryUsage: 0.5, status: '运行中', threads: 152 },
  { pid: 108, name: 'csrss.exe', cpuUsage: 0.3, memoryUsage: 1.2, status: '运行中', threads: 14 },
  { pid: 532, name: 'svchost.exe', cpuUsage: 1.2, memoryUsage: 3.5, status: '运行中', threads: 28 },
  { pid: 1024, name: 'explorer.exe', cpuUsage: 2.5, memoryUsage: 8.4, status: '运行中', threads: 65 },
  { pid: 2048, name: 'chrome.exe', cpuUsage: 15.3, memoryUsage: 22.1, status: '运行中', threads: 48 },
  { pid: 3012, name: 'code.exe', cpuUsage: 8.7, memoryUsage: 15.6, status: '运行中', threads: 36 },
  { pid: 4096, name: 'node.exe', cpuUsage: 5.2, memoryUsage: 6.3, status: '运行中', threads: 12 },
  { pid: 5120, name: 'taskmgr.exe', cpuUsage: 0.8, memoryUsage: 2.1, status: '运行中', threads: 8 },
  { pid: 6144, name: 'notepad.exe', cpuUsage: 0.1, memoryUsage: 0.8, status: '运行中', threads: 4 },
  { pid: 7168, name: 'cmd.exe', cpuUsage: 0.0, memoryUsage: 0.4, status: '运行中', threads: 3 },
];

const mockSystemInfo: SystemInfo = {
  os: 'Windows 11 Pro',
  osVersion: '10.0.22631',
  hostname: 'DESKTOP-REMOTE01',
  cpu: {
    model: 'Intel Core i7-13700K',
    cores: 16,
    usage: 23,
    perCore: [18, 25, 12, 30, 15, 22, 28, 20, 16, 24, 19, 26, 14, 21, 17, 23],
    temperature: 62,
  },
  memory: { total: 34359738368, used: 18779942912, available: 15579795456 },
  disks: [
    { name: 'C:', total: 256000000000, used: 128000000000, available: 128000000000 },
    { name: 'D:', total: 512000000000, used: 256000000000, available: 256000000000 },
    { name: 'E:', total: 1024000000000, used: 512000000000, available: 512000000000 },
  ],
  network: [
    { interface: '以太网', ip: '192.168.1.100', speed: '1 Gbps', sent: 1073741824, received: 5368709120 },
    { interface: 'Wi-Fi', ip: '192.168.1.101', speed: '866 Mbps', sent: 536870912, received: 2147483648 },
  ],
  uptime: 259200,
};

let latencyInterval: ReturnType<typeof setInterval> | null = null;

export const useRemoteStore = create<RemoteState & RemoteActions>((set, get) => ({
  activeTab: 'dashboard',
  isConnected: false,
  connectedDevice: null,
  devices: [],
  files: mockFiles,
  currentPath: 'C:\\Users\\Admin',
  processes: mockProcesses,
  systemInfo: mockSystemInfo,
  operationLogs: [],
  fileTransfers: [],
  clipboardItems: [],
  latency: 0,
  latencyHistory: [],
  connectStartTime: null,
  isScreenSharing: false,
  isAudioStreaming: false,
  audioVolume: 75,
  terminalHistory: [],
  notifications: [],
  sidebarCollapsed: false,
  fileSearch: '',
  processSearch: '',
  processSortBy: 'cpu',
  logCategoryFilter: 'all',

  setActiveTab: (tab) => set({ activeTab: tab }),

  connect: async (device) => {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.id }),
      });
      if (res.ok) {
        set({ isConnected: true, connectedDevice: device, connectStartTime: Date.now(), latency: 15, latencyHistory: [15] });
        get().startLatencyMonitor();
        toast.success(`已连接到 ${device.name}`);
        get().fetchFiles(); get().fetchProcesses(); get().fetchSystemInfo(); get().fetchOperationLogs(); get().fetchFileTransfers();
      } else { throw new Error('连接失败'); }
    } catch {
      set({ isConnected: true, connectedDevice: device, connectStartTime: Date.now(), latency: 15, latencyHistory: [15] });
      get().startLatencyMonitor();
      toast.success(`已连接到 ${device.name}（模拟模式）`);
    }
  },

  disconnect: async () => {
    try { const { connectedDevice } = get(); if (connectedDevice) await fetch(`/api/connections/${connectedDevice.id}`, { method: 'POST' }); } catch {}
    get().stopLatencyMonitor();
    set({ isConnected: false, connectedDevice: null, connectStartTime: null, latency: 0, latencyHistory: [], isScreenSharing: false, isAudioStreaming: false });
    toast.info('已断开连接');
  },

  fetchDevices: async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) { const data = await res.json(); set({ devices: data }); } else { throw new Error('获取设备列表失败'); }
    } catch {
      set({
        devices: [
          { id: '1', name: '办公室电脑', host: '192.168.1.100', port: 9527, os: 'windows', status: 'online', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '2', name: '家庭电脑', host: '192.168.1.101', port: 9527, os: 'windows', status: 'offline', lastSeen: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '3', name: '测试服务器', host: '10.0.0.50', port: 9527, os: 'linux', status: 'online', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '4', name: 'MacBook Pro', host: '192.168.1.102', port: 9527, os: 'macos', status: 'online', lastSeen: new Date(Date.now() - 300000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '5', name: '开发服务器', host: '10.0.0.100', port: 22, os: 'linux', status: 'online', lastSeen: new Date(Date.now() - 60000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '6', name: '数据库服务器', host: '10.0.0.200', port: 9527, os: 'linux', status: 'offline', lastSeen: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '7', name: '会议室电脑', host: '192.168.1.150', port: 9527, os: 'windows', status: 'offline', lastSeen: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '8', name: '监控主机', host: '192.168.1.200', port: 9527, os: 'linux', status: 'online', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
      });
    }
  },

  addDevice: async (input) => {
    try {
      const res = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      if (res.ok) { const data = await res.json(); set((s) => ({ devices: [...s.devices, data] })); toast.success('设备添加成功'); } else { throw new Error('添加设备失败'); }
    } catch {
      const newDevice: Device = { id: Date.now().toString(), ...input, status: 'offline', lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      set((s) => ({ devices: [...s.devices, newDevice] }));
      toast.success('设备添加成功（本地）');
    }
  },

  deleteDevice: async (id) => {
    try { await fetch(`/api/devices/${id}`, { method: 'DELETE' }); } catch {}
    set((s) => ({ devices: s.devices.filter((d) => d.id !== id) }));
    toast.success('设备已删除');
  },

  fetchFiles: async (path) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path || get().currentPath)}`);
      if (res.ok) { const data = await res.json(); set({ files: data }); } else { throw new Error('获取文件列表失败'); }
    } catch { set({ files: mockFiles }); }
  },

  setCurrentPath: (path) => { set({ currentPath: path }); get().fetchFiles(path); },

  fetchProcesses: async () => {
    try { const res = await fetch('/api/processes'); if (res.ok) { const data = await res.json(); set({ processes: data }); } else { throw new Error('获取进程列表失败'); } } catch { set({ processes: mockProcesses }); }
  },

  fetchSystemInfo: async () => {
    try { const res = await fetch('/api/system'); if (res.ok) { const data = await res.json(); set({ systemInfo: data }); } else { throw new Error('获取系统信息失败'); } } catch { set({ systemInfo: mockSystemInfo }); }
  },

  fetchOperationLogs: async () => {
    try { const res = await fetch('/api/operations'); if (res.ok) { const data = await res.json(); set({ operationLogs: data }); } else { throw new Error('获取操作日志失败'); } } catch {
      set({
        operationLogs: [
          { id: '1', deviceId: '1', category: '连接', action: '建立连接', detail: '连接到办公室电脑', severity: 'info', createdAt: new Date(Date.now() - 300000).toISOString() },
          { id: '2', deviceId: '1', category: '文件', action: '上传文件', detail: '上传 report.docx (2.4 MB)', severity: 'info', createdAt: new Date(Date.now() - 600000).toISOString() },
          { id: '3', deviceId: '1', category: '系统', action: '进程管理', detail: '终止进程 chrome.exe (PID: 2048)', severity: 'warning', createdAt: new Date(Date.now() - 900000).toISOString() },
          { id: '4', deviceId: '1', category: '屏幕', action: '屏幕共享', detail: '开始屏幕共享', severity: 'info', createdAt: new Date(Date.now() - 1200000).toISOString() },
          { id: '5', deviceId: '1', category: '连接', action: '断开连接', detail: '主动断开连接', severity: 'warning', createdAt: new Date(Date.now() - 1800000).toISOString() },
          { id: '6', deviceId: '1', category: '文件', action: '下载文件', detail: '下载 config.json (512 B)', severity: 'info', createdAt: new Date(Date.now() - 2400000).toISOString() },
          { id: '7', deviceId: '1', category: '音频', action: '音频设置', detail: '调整音量至 75%', severity: 'info', createdAt: new Date(Date.now() - 3000000).toISOString() },
          { id: '8', deviceId: '1', category: '系统', action: '系统告警', detail: 'CPU 使用率超过 90%', severity: 'error', createdAt: new Date(Date.now() - 3600000).toISOString() },
        ],
      });
    }
  },

  fetchFileTransfers: async () => {
    try { const res = await fetch('/api/transfers'); if (res.ok) { const data = await res.json(); set({ fileTransfers: data }); } else { throw new Error('获取传输列表失败'); } } catch {
      set({
        fileTransfers: [
          { id: '1', deviceId: '1', fileName: 'project.zip', fileSize: 52428800, direction: 'upload', status: 'completed', progress: 100, speed: '2.5 MB/s', createdAt: new Date(Date.now() - 600000).toISOString(), updatedAt: new Date().toISOString() },
          { id: '2', deviceId: '1', fileName: 'database.sql', fileSize: 104857600, direction: 'download', status: 'transferring', progress: 65, speed: '3.1 MB/s', createdAt: new Date(Date.now() - 300000).toISOString(), updatedAt: new Date().toISOString() },
          { id: '3', deviceId: '1', fileName: 'report.docx', fileSize: 2516582, direction: 'upload', status: 'transferring', progress: 82, speed: '1.8 MB/s', createdAt: new Date(Date.now() - 120000).toISOString(), updatedAt: new Date().toISOString() },
          { id: '4', deviceId: '1', fileName: 'backup.tar.gz', fileSize: 209715200, direction: 'download', status: 'pending', progress: 0, speed: '0 KB/s', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
      });
    }
  },

  addClipboardItem: (item) => set((s) => ({ clipboardItems: [item, ...s.clipboardItems] })),
  removeClipboardItem: (index) => set((s) => ({ clipboardItems: s.clipboardItems.filter((_, i) => i !== index) })),

  toggleScreenSharing: async () => {
    const { isScreenSharing } = get();
    try { await fetch('/api/screen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: isScreenSharing ? 'stop' : 'start' }) }); } catch {}
    set({ isScreenSharing: !isScreenSharing });
    toast.success(isScreenSharing ? '已停止屏幕共享' : '已开始屏幕共享');
  },

  toggleAudioStreaming: async () => {
    const { isAudioStreaming } = get();
    try { await fetch('/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: isAudioStreaming ? 'stop' : 'start' }) }); } catch {}
    set({ isAudioStreaming: !isAudioStreaming });
    toast.success(isAudioStreaming ? '已停止音频传输' : '已开始音频传输');
  },

  setAudioVolume: (volume) => set({ audioVolume: volume }),
  addTerminalCommand: (cmd) => set((s) => ({ terminalHistory: [...s.terminalHistory, cmd] })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setFileSearch: (search) => set({ fileSearch: search }),
  setProcessSearch: (search) => set({ processSearch: search }),
  setProcessSortBy: (sortBy) => set({ processSortBy: sortBy }),
  setLogCategoryFilter: (filter) => set({ logCategoryFilter: filter }),
  markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
  clearNotifications: () => set({ notifications: [] }),

  startLatencyMonitor: () => {
    if (latencyInterval) return;
    latencyInterval = setInterval(() => {
      const { isConnected, latencyHistory } = get();
      if (!isConnected) { get().stopLatencyMonitor(); return; }
      const newLatency = Math.max(1, Math.floor(Math.random() * 30) + 10);
      const newHistory = [...latencyHistory, newLatency].slice(-30);
      set({ latency: newLatency, latencyHistory: newHistory });
    }, 3000);
  },

  stopLatencyMonitor: () => {
    if (latencyInterval) { clearInterval(latencyInterval); latencyInterval = null; }
  },
}));

export function formatBytes(bytes: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(ms: number): string {
  if (!ms || !Number.isFinite(ms) || ms < 0) return '00:00:00';
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
