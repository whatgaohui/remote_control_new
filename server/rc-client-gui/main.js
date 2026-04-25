/**
 * RC-Client GUI - Electron Main Process
 * Manages BrowserWindow, WebSocket client, and IPC communication v2.0.0
 *
 * v2.0.0 - Complete rewrite for Windows startup robustness:
 *  - no-sandbox / disable-gpu-sandbox switches BEFORE anything else
 *  - show:false + 5s timeout fallback (never leave user with invisible window)
 *  - did-fail-load / unresponsive / render-process-gone handlers
 *  - Error logs written next to exe (process.cwd()) with userData fallback
 *  - app.requestSingleInstanceLock() as FIRST thing after requires
 *  - app.exit(0) instead of app.quit() for second instance
 *  - sandbox:false in webPreferences for Windows IPC compatibility
 *  - --dev flag support for auto-opening DevTools
 */

// ─── CRITICAL: Require electron first, then set sandbox flags ────────────────
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');

// Sandbox flags must be set before app.ready
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');

// ─── Dev mode detection ──────────────────────────────────────────────────────
const isDev = process.argv.includes('--dev');
if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

// ─── 防止多实例（必须在最前面）───────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('另一个实例已在运行，退出...');
  app.exit(0);  // app.exit(0) is more reliable than app.quit() on Windows
}

const VERSION = '2.1.0';

// ─── 错误日志（尽早初始化，写文件到exe旁边）──────────────────────────────────────────
let logFilePath;
try {
  logFilePath = path.join(process.cwd(), 'rc-client-error.log');
  fs.appendFileSync(logFilePath, '', 'utf-8');
} catch (e) {
  try {
    logFilePath = path.join(app.getPath('userData'), 'rc-client-error.log');
  } catch (e2) {
    logFilePath = path.join(os.homedir(), 'rc-client-error.log');
  }
}

function writeErrorLog(msg) {
  try {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFilePath, line, 'utf-8');
    console.log(line);  // Echo to stdout for terminal debugging
  } catch (e) { /* ignore */ }
}

writeErrorLog(`RC-Client v${VERSION} starting...`);
writeErrorLog(`Log file: ${logFilePath}`);
writeErrorLog(`Dev mode: ${isDev}`);
writeErrorLog(`Platform: ${process.platform} ${process.arch}`);
writeErrorLog(`Electron: ${process.versions.electron}`);
writeErrorLog(`Node: ${process.versions.node}`);
writeErrorLog(`Chrome: ${process.versions.chrome}`);

process.on('uncaughtException', (err) => {
  writeErrorLog(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  try {
    dialog.showErrorBox('RC-Client 错误', `程序发生未预期的错误:\n${err.message}\n\n错误日志: ${logFilePath}`);
  } catch (e) { /* ignore */ }
});

process.on('unhandledRejection', (reason) => {
  writeErrorLog(`UNHANDLED REJECTION: ${reason}`);
});

// ─── Global State ────────────────────────────────────────────────────────────
let mainWindow = null;
let ws = null;
let isConnected = false;
let isConnecting = false;
let isAuthenticated = false;
let connectionConfig = { host: '', port: 9527, password: '' };
let pingStart = 0;
let latency = 0;
let dataSent = 0;
let dataReceived = 0;
let connectedAt = null;
let shellMode = false;

// Auto-reconnect
let autoReconnect = false;
let reconnectInterval = 5000;
let reconnectTimer = null;

// Connection history
const HISTORY_FILE = path.join(os.homedir(), '.rc-client-history.json');

function loadConnectionHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return [];
}

function saveConnectionHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 10), null, 2));
  } catch (e) { /* ignore */ }
}

function addToHistory(config) {
  const history = loadConnectionHistory();
  const entry = {
    host: config.host,
    port: config.port,
    password: !!config.password,
    lastConnected: new Date().toISOString()
  };
  const idx = history.findIndex(h => h.host === entry.host && h.port === entry.port);
  if (idx !== -1) history.splice(idx, 1);
  history.unshift(entry);
  saveConnectionHistory(history);
}

// ─── Config persistence ──────────────────────────────────────────────────────
const CONFIG_FILE = path.join(os.homedir(), '.rc-client-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return {
    defaultHost: '',
    defaultPort: 9527,
    defaultPassword: '',
    autoReconnect: false,
    reconnectInterval: 5000,
    theme: 'dark'
  };
}

function saveConfigToFile(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// ─── Window Creation ─────────────────────────────────────────────────────────
function createWindow() {
  writeErrorLog('Creating main window...');

  try {
    mainWindow = new BrowserWindow({
      width: 1100,
      height: 750,
      minWidth: 900,
      minHeight: 600,
      frame: false,
      backgroundColor: '#0f172a',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,  // Needed for some IPC on Windows
      },
    });

    writeErrorLog('BrowserWindow created, loading index.html...');

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    // ─── CRITICAL: Show window with fallback ───────────────────────────────
    let windowShown = false;

    mainWindow.once('ready-to-show', () => {
      if (!windowShown) {
        windowShown = true;
        mainWindow.show();
        writeErrorLog('主窗口已显示 (via ready-to-show)');
      }
    });

    // Fallback: if ready-to-show never fires, force show after 5 seconds
    setTimeout(() => {
      if (!windowShown && mainWindow && !mainWindow.isDestroyed()) {
        windowShown = true;
        mainWindow.show();
        writeErrorLog('主窗口已显示 (via 5s fallback timeout)');
      }
    }, 5000);

    // ─── Error handlers ───────────────────────────────────────────────────
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
      writeErrorLog(`页面加载失败: ${errorCode} ${errorDesc} URL: ${validatedURL}`);
      try {
        mainWindow.webContents.executeJavaScript(`
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-family:monospace;text-align:center;padding:40px;">' +
            '<div><h2 style="font-size:24px;margin-bottom:16px;">页面加载失败</h2>' +
            '<p style="color:#94a3b8;">错误代码: ${errorCode}</p>' +
            '<p style="color:#94a3b8;">${errorDesc}</p>' +
            '<p style="color:#64748b;margin-top:20px;">请检查应用程序文件是否完整</p></div></div>';
        `);
        if (!windowShown) {
          windowShown = true;
          mainWindow.show();
        }
      } catch (e) {
        writeErrorLog(`Failed to show error page: ${e.message}`);
      }
    });

    mainWindow.on('unresponsive', () => {
      writeErrorLog('主窗口无响应 (unresponsive)');
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
      writeErrorLog(`渲染进程崩溃: reason=${details.reason} exitCode=${details.exitCode}`);
    });

    // ─── Window lifecycle ─────────────────────────────────────────────────
    mainWindow.on('closed', () => {
      mainWindow = null;
      if (ws) {
        ws.close();
        ws = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    // Dev mode: auto-open DevTools
    if (isDev) {
      mainWindow.webContents.openDevTools();
      writeErrorLog('DevTools opened (--dev flag)');
    }

    writeErrorLog('主窗口创建成功');
  } catch (err) {
    writeErrorLog(`创建窗口失败: ${err.message}\n${err.stack}`);
    try {
      dialog.showErrorBox('RC-Client 错误', `创建窗口失败:\n${err.message}`);
    } catch (e) { /* ignore */ }
  }
}

// ─── WebSocket Client ────────────────────────────────────────────────────────
function connectToServer(config) {
  if (isConnected || isConnecting) {
    return { success: false, error: 'Already connected or connecting' };
  }

  connectionConfig = {
    host: config.host,
    port: config.port || 9527,
    password: config.password || ''
  };

  const url = `ws://${connectionConfig.host}:${connectionConfig.port}/ws`;
  isConnecting = true;
  latency = 0;
  dataSent = 0;
  dataReceived = 0;

  sendToRenderer('connection-status', {
    status: 'connecting',
    host: connectionConfig.host,
    port: connectionConfig.port
  });

  try {
    ws = new WebSocket(url, {
      handshakeTimeout: 10000
    });
  } catch (e) {
    isConnecting = false;
    sendToRenderer('connection-error', { message: `Connection failed: ${e.message}` });
    return { success: false, error: e.message };
  }

  ws.on('open', () => {
    isConnecting = false;
    isConnected = true;
    connectedAt = Date.now();
    addToHistory(connectionConfig);
    sendToRenderer('connected', {
      host: connectionConfig.host,
      port: connectionConfig.port
    });
    writeErrorLog(`已连接到 ${connectionConfig.host}:${connectionConfig.port}`);
  });

  ws.on('message', (data) => {
    dataReceived += data.length;
    try {
      const msg = JSON.parse(data.toString());
      handleServerMessage(msg);
    } catch (e) {
      // ignore parse errors
    }
  });

  ws.on('close', (code, reason) => {
    isConnected = false;
    isAuthenticated = false;
    isConnecting = false;
    shellMode = false;
    sendToRenderer('disconnected', {
      code,
      reason: reason.toString()
    });
    writeErrorLog(`连接断开 (code: ${code})`);

    // Auto-reconnect
    if (autoReconnect && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!isConnected && !isConnecting) {
          connectToServer(connectionConfig);
        }
      }, reconnectInterval);
    }
  });

  ws.on('error', (err) => {
    isConnecting = false;
    sendToRenderer('connection-error', { message: err.message });
    writeErrorLog(`连接错误: ${err.message}`);
  });

  return { success: true };
}

function disconnectFromServer() {
  autoReconnect = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  isConnected = false;
  isAuthenticated = false;
  isConnecting = false;
  shellMode = false;
  return { success: true };
}

function sendMessage(msg) {
  if (ws && isConnected) {
    const data = JSON.stringify(msg);
    dataSent += data.length;
    ws.send(data);
    return true;
  }
  return false;
}

function handleServerMessage(data) {
  switch (data.type) {
    case 'welcome': {
      if (data.requiresAuth) {
        sendMessage({ type: 'auth', password: connectionConfig.password });
      } else {
        isAuthenticated = true;
        sendToRenderer('authenticated', { requiresAuth: false });
      }
      break;
    }
    case 'auth_ok': {
      isAuthenticated = true;
      sendToRenderer('authenticated', { requiresAuth: true });
      break;
    }
    case 'auth_failed': {
      isAuthenticated = false;
      sendToRenderer('auth-failed', {
        message: data.message || 'Authentication failed',
        requiresAuth: true
      });
      break;
    }
    case 'pong': {
      latency = Date.now() - pingStart;
      sendToRenderer('pong', { latency });
      break;
    }
    case 'system_info':
    case 'processes':
    case 'files':
    case 'command_result':
    case 'shell_output':
    case 'screen_frame':
    case 'clipboard_update':
    case 'audio_started':
    case 'audio_stopped':
    case 'error':
    default: {
      sendToRenderer('server-message', data);
      break;
    }
  }
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send(channel, data);
    } catch (e) { /* ignore */ }
  }
}

function startPing() {
  if (isConnected) {
    pingStart = Date.now();
    sendMessage({ type: 'ping' });
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
writeErrorLog('Setting up IPC handlers...');

ipcMain.handle('connect', (event, config) => {
  return connectToServer(config);
});

ipcMain.handle('disconnect', () => {
  return disconnectFromServer();
});

ipcMain.handle('get-status', () => {
  return {
    isConnected,
    isConnecting,
    isAuthenticated,
    host: connectionConfig.host,
    port: connectionConfig.port,
    latency,
    dataSent,
    dataReceived,
    uptime: connectedAt ? Date.now() - connectedAt : 0,
    shellMode
  };
});

ipcMain.handle('send-command', (event, { type, data }) => {
  if (!isConnected) {
    return { success: false, error: 'Not connected' };
  }
  if (!isAuthenticated && type !== 'auth') {
    return { success: false, error: 'Not authenticated' };
  }

  let msg = { type };

  switch (type) {
    case 'get_system_info':
      break;
    case 'get_processes':
      break;
    case 'get_files':
      msg.path = data?.path || 'C:\\Users';
      break;
    case 'shell_input':
      msg.input = data?.input || '';
      shellMode = true;
      break;
    case 'shell_exit':
      msg.input = 'exit';
      shellMode = false;
      break;
    case 'command':
      msg.command = data?.command || '';
      break;
    case 'ping':
      pingStart = Date.now();
      break;
    case 'kill_process':
      msg.pid = data?.pid;
      break;
    case 'screen_request':
      msg.quality = data?.quality || 80;
      msg.fps = data?.fps || 30;
      break;
    case 'auth':
      msg.password = data?.password || '';
      break;
    default:
      if (data) Object.assign(msg, data);
  }

  const sent = sendMessage(msg);
  return { success: sent };
});

ipcMain.handle('get-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', (event, config) => {
  autoReconnect = config.autoReconnect || false;
  reconnectInterval = config.reconnectInterval || 5000;
  return saveConfigToFile(config);
});

ipcMain.handle('get-connection-history', () => {
  return loadConnectionHistory();
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
  return true;
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
  return true;
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
  return true;
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('get-version', () => {
  return VERSION;
});

ipcMain.handle('reconnect-with-password', (event, password) => {
  try {
    // Disconnect current connection
    disconnectFromServer();

    // Update password in config
    connectionConfig.password = password || '';

    // Reconnect
    const result = connectToServer({
      host: connectionConfig.host,
      port: connectionConfig.port,
      password: password || ''
    });
    return result;
  } catch (err) {
    writeErrorLog(`reconnect-with-password error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

writeErrorLog('IPC handlers set up successfully');

// ─── Periodic status updates ─────────────────────────────────────────────────
setInterval(() => {
  if (isConnected && isAuthenticated) {
    startPing();
  }
  sendToRenderer('status-update', {
    isConnected,
    isConnecting,
    isAuthenticated,
    latency,
    dataSent,
    dataReceived,
    uptime: connectedAt ? Date.now() - connectedAt : 0
  });
}, 3000);

// ─── Second instance handler ─────────────────────────────────────────────────
app.on('second-instance', () => {
  writeErrorLog('检测到第二个实例尝试启动');
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ─── App Lifecycle ───────────────────────────────────────────────────────────
writeErrorLog('Waiting for app.whenReady...');

app.whenReady().then(() => {
  writeErrorLog('App ready, initializing...');
  try {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });

    writeErrorLog('App initialization complete');
  } catch (err) {
    writeErrorLog(`Initialization error: ${err.message}\n${err.stack}`);
    try {
      dialog.showErrorBox('RC-Client 错误', `应用初始化失败:\n${err.message}`);
    } catch (e) { /* ignore */ }
  }
}).catch((err) => {
  writeErrorLog(`app.whenReady failed: ${err.message}`);
  try {
    dialog.showErrorBox('RC-Client 错误', `应用初始化失败:\n${err.message}`);
  } catch (e) { /* ignore */ }
});

app.on('window-all-closed', () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  app.quit();
});

app.on('will-quit', () => {
  writeErrorLog('App will-quit, cleaning up...');
  try {
    if (ws) { ws.close(); ws = null; }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  } catch (e) { /* ignore */ }
});
