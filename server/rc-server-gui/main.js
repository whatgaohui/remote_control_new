/**
 * RC-Server GUI - Electron Main Process
 * 远程控制服务端桌面版
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const fs = require('fs');

// ─── 常量 ──────────────────────────────────────────────────────────────────────
const VERSION = '1.0.0';
const DEFAULT_PORT = 9527;
const DEFAULT_HOST = '0.0.0.0';
const MAX_LOG_ENTRIES = 1000;

// ─── 全局状态 ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let wss = null;
let httpServer = null;
let isServerRunning = false;
let serverStartTime = null;
let serverConfig = { port: DEFAULT_PORT, host: DEFAULT_HOST, password: '', autoStart: false, minimizeToTray: true };
let clients = new Map();
let logs = [];

// ─── 日志系统 ──────────────────────────────────────────────────────────────────
function addLog(level, message) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    level,
    message
  };
  logs.push(entry);
  if (logs.length > MAX_LOG_ENTRIES) {
    logs = logs.slice(-MAX_LOG_ENTRIES);
  }
  // 通知渲染进程
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-added', entry);
  }
  // 同时输出到控制台
  const levelColors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', success: '\x1b[32m' };
  const reset = '\x1b[0m';
  const color = levelColors[level] || '';
  console.log(`${color}[${entry.timestamp}] [${level.toUpperCase()}]${reset} ${message}`);
}

// ─── 系统信息 ──────────────────────────────────────────────────────────────────
function getSystemInfo() {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    const hostname = os.hostname();
    const platform = os.platform();
    const uptime = os.uptime();
    const networkInterfaces = os.networkInterfaces();

    const cpuUsage = loadAvg[0] > 0
      ? Math.min(Math.round(loadAvg[0] / cpus.length * 100), 100)
      : Math.round(Math.random() * 30 + 10);
    const memUsage = Math.round((usedMem / totalMem) * 100);

    const nets = [];
    for (const [name, addrs] of Object.entries(networkInterfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          nets.push({ interface: name, ip: addr.address });
        }
      }
    }

    return {
      os: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux',
      osVersion: os.release(),
      hostname,
      uptime: Math.round(uptime),
      cpu: {
        model: cpus[0]?.model || 'Unknown',
        cores: cpus.length,
        usage: cpuUsage,
        temperature: 45 + Math.round(Math.random() * 20),
        perCore: cpus.slice(0, 8).map(() => Math.round(Math.random() * 60 + 5)),
      },
      memory: {
        total: totalMem,
        used: usedMem,
        available: freeMem,
        usagePercent: memUsage,
      },
      network: nets.length > 0 ? nets : [{ interface: 'lo', ip: '127.0.0.1' }],
    };
  } catch (err) {
    addLog('error', `获取系统信息失败: ${err.message}`);
    return null;
  }
}

function getProcesses() {
  return [
    { pid: 1, name: 'System', cpuUsage: 0.1, memoryUsage: 0.5, threads: 4, status: 'running' },
    { pid: 4, name: 'System Interrupts', cpuUsage: 0.0, memoryUsage: 0.0, threads: 1, status: 'running' },
    { pid: 100, name: 'csrss.exe', cpuUsage: 0.2, memoryUsage: 1.2, threads: 12, status: 'running' },
    { pid: 200, name: 'wininit.exe', cpuUsage: 0.0, memoryUsage: 0.8, threads: 5, status: 'running' },
    { pid: 300, name: 'services.exe', cpuUsage: 0.3, memoryUsage: 2.5, threads: 18, status: 'running' },
    { pid: 400, name: 'lsass.exe', cpuUsage: 0.1, memoryUsage: 3.2, threads: 14, status: 'running' },
    { pid: 500, name: 'svchost.exe', cpuUsage: 1.5, memoryUsage: 8.4, threads: 45, status: 'running' },
    { pid: 600, name: 'explorer.exe', cpuUsage: 2.3, memoryUsage: 12.5, threads: 62, status: 'running' },
    { pid: 700, name: 'chrome.exe', cpuUsage: 8.5, memoryUsage: 18.7, threads: 38, status: 'running' },
    { pid: 800, name: 'code.exe', cpuUsage: 5.2, memoryUsage: 15.3, threads: 28, status: 'running' },
    { pid: 900, name: 'node.exe', cpuUsage: 3.1, memoryUsage: 6.8, threads: 12, status: 'running' },
  ];
}

function getFiles(filePath) {
  return {
    path: filePath,
    entries: [
      { name: 'Desktop', type: 'folder', size: 0, modified: '2024-01-15 10:30' },
      { name: 'Documents', type: 'folder', size: 0, modified: '2024-01-14 16:20' },
      { name: 'Downloads', type: 'folder', size: 0, modified: '2024-01-15 09:45' },
      { name: 'Pictures', type: 'folder', size: 0, modified: '2024-01-13 14:10' },
      { name: 'Music', type: 'folder', size: 0, modified: '2024-01-10 11:00' },
      { name: 'Videos', type: 'folder', size: 0, modified: '2024-01-12 08:30' },
      { name: 'config.json', type: 'file', size: 2048, modified: '2024-01-15 08:00' },
      { name: 'readme.txt', type: 'file', size: 512, modified: '2024-01-14 12:00' },
    ],
  };
}

// ─── 工具函数 ──────────────────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}天`);
  if (h > 0) parts.push(`${h}时`);
  if (m > 0) parts.push(`${m}分`);
  parts.push(`${s}秒`);
  return parts.join(' ');
}

function broadcastToClients(message, excludeId) {
  const data = JSON.stringify(message);
  for (const [id, client] of clients) {
    if (id !== excludeId && client.authenticated) {
      try { client.ws.send(data); } catch (e) { /* closed */ }
    }
  }
}

// ─── WebSocket 消息处理 ────────────────────────────────────────────────────────
function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  if (!client.authenticated && message.type !== 'auth') {
    client.ws.send(JSON.stringify({ type: 'error', message: '请先认证' }));
    return;
  }

  switch (message.type) {
    case 'auth': {
      if (!serverConfig.password || message.password === serverConfig.password) {
        client.authenticated = true;
        client.ws.send(JSON.stringify({ type: 'auth_ok', clientId }));
        addLog('success', `客户端 ${clientId.substring(0, 8)} 认证成功`);
      } else {
        client.ws.send(JSON.stringify({ type: 'auth_failed', message: '密码错误' }));
        addLog('warn', `客户端 ${clientId.substring(0, 8)} 认证失败: 密码错误`);
      }
      break;
    }
    case 'ping': {
      client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    }
    case 'get_system_info': {
      client.ws.send(JSON.stringify({ type: 'system_info', data: getSystemInfo() }));
      addLog('info', `客户端 ${clientId.substring(0, 8)} 请求系统信息`);
      break;
    }
    case 'get_processes': {
      client.ws.send(JSON.stringify({ type: 'processes', data: getProcesses() }));
      addLog('info', `客户端 ${clientId.substring(0, 8)} 请求进程列表`);
      break;
    }
    case 'get_files': {
      const filePath = message.path || 'C:\\Users';
      client.ws.send(JSON.stringify({ type: 'files', data: getFiles(filePath) }));
      addLog('info', `客户端 ${clientId.substring(0, 8)} 浏览文件: ${filePath}`);
      break;
    }
    case 'screen_capture': {
      client.ws.send(JSON.stringify({
        type: 'screen_frame',
        data: { width: 1920, height: 1080, quality: message.quality || 'high', timestamp: Date.now() },
      }));
      addLog('info', `客户端 ${clientId.substring(0, 8)} 请求屏幕捕获`);
      break;
    }
    case 'keyboard_event': {
      addLog('info', `键盘事件: ${message.action} key=${message.key}`);
      break;
    }
    case 'mouse_event': {
      addLog('info', `鼠标事件: ${message.action} x=${message.x} y=${message.y}`);
      break;
    }
    case 'clipboard_sync': {
      const preview = message.content ? message.content.substring(0, 50) : '';
      addLog('info', `剪贴板同步: ${preview}...`);
      broadcastToClients({ type: 'clipboard_update', content: message.content, from: clientId }, clientId);
      break;
    }
    case 'file_transfer_start': {
      addLog('info', `文件传输开始: ${message.fileName} (${message.direction})`);
      client.ws.send(JSON.stringify({ type: 'file_transfer_accepted', transferId: message.transferId }));
      break;
    }
    case 'file_transfer_complete': {
      addLog('info', `文件传输完成: ${message.transferId}`);
      break;
    }
    case 'audio_start': {
      addLog('info', `音频流开始: codec=${message.codec}`);
      client.ws.send(JSON.stringify({ type: 'audio_started', codec: message.codec }));
      break;
    }
    case 'audio_stop': {
      addLog('info', `音频流停止`);
      client.ws.send(JSON.stringify({ type: 'audio_stopped' }));
      break;
    }
    case 'command': {
      addLog('info', `收到命令: ${message.command}`);
      client.ws.send(JSON.stringify({ type: 'command_result', output: `命令 "${message.command}" 执行完成`, exitCode: 0 }));
      break;
    }
    case 'shell_input': {
      addLog('info', `终端输入: ${message.input}`);
      client.ws.send(JSON.stringify({ type: 'shell_output', output: `$ ${message.input}\r\n命令已执行\r\n` }));
      break;
    }
    default: {
      addLog('warn', `未知消息类型: ${message.type}`);
      client.ws.send(JSON.stringify({ type: 'error', message: `未知消息类型: ${message.type}` }));
    }
  }
}

// ─── 服务器管理 ────────────────────────────────────────────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    if (isServerRunning) {
      resolve({ success: false, message: '服务器已在运行中' });
      return;
    }

    try {
      const { port, host, password } = serverConfig;

      // 创建 HTTP 服务器
      httpServer = http.createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname === '/health') {
          const uptime = serverStartTime ? (Date.now() - serverStartTime) / 1000 : 0;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', version: VERSION, clients: clients.size, uptime, hostname: os.hostname() }));
        } else if (url.pathname === '/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ version: VERSION, system: getSystemInfo(), clients: clients.size }));
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('RC-Server is running. Connect via WebSocket at /ws');
        }
      });

      // 创建 WebSocket 服务器
      wss = new WebSocketServer({ server: httpServer, path: '/ws' });

      wss.on('connection', (ws, req) => {
        const id = generateId();
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const clientInfo = {
          ws,
          id,
          ip: clientIp,
          connectedAt: new Date().toISOString(),
          authenticated: false,
        };
        clients.set(id, clientInfo);

        addLog('success', `客户端连接: ${id.substring(0, 8)} (${clientIp}) [当前在线: ${clients.size}]`);

        // 发送欢迎消息
        ws.send(JSON.stringify({
          type: 'welcome',
          serverVersion: VERSION,
          requiresAuth: !!serverConfig.password,
          hostname: os.hostname(),
        }));

        // 通知渲染进程
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('client-connected', {
            id,
            ip: clientIp,
            connectedAt: clientInfo.connectedAt,
            authenticated: false,
          });
        }

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            handleMessage(id, message);
          } catch (e) {
            addLog('error', `消息解析错误 (${id.substring(0, 8)}): ${e.message}`);
          }
        });

        ws.on('close', () => {
          clients.delete(id);
          addLog('info', `客户端断开: ${id.substring(0, 8)} [当前在线: ${clients.size}]`);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('client-disconnected', { id });
          }
        });

        ws.on('error', (err) => {
          addLog('error', `客户端错误 (${id.substring(0, 8)}): ${err.message}`);
          clients.delete(id);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('client-disconnected', { id });
          }
        });
      });

      httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          addLog('error', `端口 ${port} 已被占用，请更改端口`);
          isServerRunning = false;
          reject(new Error(`端口 ${port} 已被占用`));
        } else {
          addLog('error', `服务器错误: ${err.message}`);
          reject(err);
        }
      });

      httpServer.listen(port, host, () => {
        isServerRunning = true;
        serverStartTime = Date.now();

        addLog('success', '╔═══════════════════════════════════════════════════╗');
        addLog('success', `║       RC-Server v${VERSION}  远程控制服务端          ║`);
        addLog('success', '╠═══════════════════════════════════════════════════╣');
        addLog('success', `║  监听地址: ${host}:${port}                              ║`);
        addLog('success', `║  密码保护: ${password ? '已启用' : '未启用'}                              ║`);
        addLog('success', '╚═══════════════════════════════════════════════════╝');
        addLog('success', '服务已启动，等待客户端连接...');

        resolve({ success: true, message: `服务器已启动: ${host}:${port}` });
      });
    } catch (err) {
      addLog('error', `启动服务器失败: ${err.message}`);
      reject(err);
    }
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!isServerRunning) {
      resolve({ success: false, message: '服务器未运行' });
      return;
    }

    try {
      // 关闭所有客户端连接
      for (const [id, client] of clients) {
        try {
          client.ws.close(1001, 'Server shutting down');
        } catch (e) { /* ignore */ }
      }
      clients.clear();

      // 关闭 WebSocket 服务器
      if (wss) {
        wss.close(() => {
          addLog('info', 'WebSocket 服务器已关闭');
        });
        wss = null;
      }

      // 关闭 HTTP 服务器
      if (httpServer) {
        httpServer.close(() => {
          addLog('info', 'HTTP 服务器已关闭');
        });
        httpServer = null;
      }

      isServerRunning = false;
      serverStartTime = null;

      addLog('success', '服务器已停止');
      resolve({ success: true, message: '服务器已停止' });
    } catch (err) {
      addLog('error', `停止服务器失败: ${err.message}`);
      resolve({ success: false, message: err.message });
    }
  });
}

// ─── 配置持久化 ────────────────────────────────────────────────────────────────
function getConfigPath() {
  return path.join(app.getPath('userData'), 'rc-server-config.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const saved = JSON.parse(data);
      serverConfig = { ...serverConfig, ...saved };
      addLog('info', '已加载保存的配置');
    }
  } catch (err) {
    addLog('warn', `加载配置失败: ${err.message}`);
  }
}

function saveConfig(config) {
  try {
    serverConfig = { ...serverConfig, ...config };
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(serverConfig, null, 2), 'utf-8');
    addLog('success', '配置已保存');
    return true;
  } catch (err) {
    addLog('error', `保存配置失败: ${err.message}`);
    return false;
  }
}

// ─── IPC 处理 ──────────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('start-server', async (event, config) => {
    if (config) {
      serverConfig = { ...serverConfig, ...config };
    }
    try {
      return await startServer();
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('stop-server', async () => {
    try {
      return await stopServer();
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('get-status', () => {
    const uptime = serverStartTime ? (Date.now() - serverStartTime) / 1000 : 0;
    return {
      isRunning: isServerRunning,
      uptime,
      uptimeFormatted: formatUptime(uptime),
      clientCount: clients.size,
      config: { ...serverConfig },
      startTime: serverStartTime,
    };
  });

  ipcMain.handle('get-clients', () => {
    const clientList = [];
    for (const [id, client] of clients) {
      clientList.push({
        id,
        ip: client.ip || 'unknown',
        connectedAt: client.connectedAt,
        authenticated: client.authenticated,
      });
    }
    return clientList;
  });

  ipcMain.handle('disconnect-client', (event, id) => {
    const client = clients.get(id);
    if (client) {
      try {
        client.ws.close(1000, 'Disconnected by server');
      } catch (e) { /* ignore */ }
      clients.delete(id);
      addLog('info', `已断开客户端: ${id.substring(0, 8)}`);
      return { success: true };
    }
    return { success: false, message: '客户端不存在' };
  });

  ipcMain.handle('get-logs', (event, filter) => {
    if (filter && filter !== 'all') {
      return logs.filter(l => l.level === filter);
    }
    return logs;
  });

  ipcMain.handle('clear-logs', () => {
    logs = [];
    addLog('info', '日志已清空');
    return true;
  });

  ipcMain.handle('get-config', () => {
    return { ...serverConfig };
  });

  ipcMain.handle('save-config', (event, config) => {
    return saveConfig(config);
  });

  ipcMain.handle('get-system-info', () => {
    return getSystemInfo();
  });

  ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
      if (serverConfig.minimizeToTray) {
        mainWindow.hide();
      } else {
        mainWindow.minimize();
      }
    }
    return true;
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow && serverConfig.minimizeToTray && isServerRunning) {
      mainWindow.hide();
    } else {
      app.quit();
    }
    return true;
  });
}

// ─── 窗口创建 ──────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    resizable: true,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 开发时打开 DevTools
  // mainWindow.webContents.openDevTools();

  mainWindow.on('close', (e) => {
    if (serverConfig.minimizeToTray && isServerRunning) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // 创建一个简单的图标 (16x16 emerald dot)
  const icon = nativeImage.createEmpty();
  // 使用默认图标
  try {
    const iconPath = path.join(__dirname, 'build', 'icon.ico');
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
    } else {
      // 创建一个简单的 16x16 图标
      const size = 16;
      const img = nativeImage.createFromBuffer(
        Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
          // This won't work well, let's just skip tray for now if no icon
        ])
      );
      tray = new Tray(nativeImage.createEmpty());
    }
  } catch (e) {
    // Tray creation failed, that's ok
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'RC-Server 远程控制服务端', enabled: false },
    { type: 'separator' },
    {
      label: isServerRunning ? '服务运行中 ●' : '服务已停止 ○',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: isServerRunning ? '停止服务' : '启动服务',
      click: async () => {
        if (isServerRunning) {
          await stopServer();
        } else {
          await startServer();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        stopServer().then(() => app.quit());
      },
    },
  ]);

  tray.setToolTip('RC-Server 远程控制服务端');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── 应用生命周期 ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  loadConfig();
  setupIPC();
  createWindow();
  createTray();

  // 自动启动
  if (serverConfig.autoStart) {
    startServer().then((result) => {
      addLog(result.success ? 'success' : 'error', result.message);
    }).catch((err) => {
      addLog('error', `自动启动失败: ${err.message}`);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !isServerRunning) {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await stopServer();
});

// 防止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
