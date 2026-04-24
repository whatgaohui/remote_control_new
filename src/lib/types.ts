export type TabId = 'dashboard' | 'screen' | 'files' | 'transfers' | 'clipboard' | 'processes' | 'system' | 'audio' | 'terminal' | 'logs' | 'download' | 'settings';

export interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  os: string;
  status: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddDeviceInput {
  name: string;
  host: string;
  port: number;
  os: string;
}

export interface FileInfo {
  name: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  path: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  status: string;
  threads: number;
}

export interface SystemInfo {
  os: string;
  osVersion: string;
  hostname: string;
  cpu: {
    model: string;
    cores: number;
    usage: number;
    perCore: number[];
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
  };
  disks: {
    name: string;
    total: number;
    used: number;
    available: number;
  }[];
  network: {
    interface: string;
    ip: string;
    speed: string;
    sent: number;
    received: number;
  }[];
  uptime: number;
}

export interface OperationLog {
  id: string;
  deviceId?: string;
  category: string;
  action: string;
  detail: string;
  severity: string;
  createdAt: string;
}

export interface FileTransfer {
  id: string;
  deviceId?: string;
  fileName: string;
  fileSize: number;
  direction: string;
  status: string;
  progress: number;
  speed: string;
  createdAt: string;
  updatedAt: string;
}
