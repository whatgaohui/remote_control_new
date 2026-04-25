/**
 * RC-Server GUI - Renderer Process
 * 处理所有 UI 交互与 IPC 通信
 */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  serverRunning: false,
  clients: [],
  logs: [],
  logFilter: 'all',
  logSearch: '',
  uptimeInterval: null,
  statusInterval: null,
};

// ─── DOM References ───────────────────────────────────────────────────────────
const dom = {};

function cacheDom() {
  // Title bar
  dom.btnMinimize = document.getElementById('btn-minimize');
  dom.btnClose = document.getElementById('btn-close');

  // Sidebar
  dom.navItems = document.querySelectorAll('.nav-item');
  dom.clientBadge = document.getElementById('client-badge');
  dom.sidebarStatusDot = document.getElementById('sidebar-status-dot');
  dom.sidebarStatusText = document.getElementById('sidebar-status-text');

  // Pages
  dom.pages = document.querySelectorAll('.page');

  // Dashboard
  dom.dashStatusIcon = document.getElementById('dash-status-icon');
  dom.dashStatusLabel = document.getElementById('dash-status-label');
  dom.dashStatusSub = document.getElementById('dash-status-sub');
  dom.btnServerToggle = document.getElementById('btn-server-toggle');
  dom.btnServerToggleIcon = document.getElementById('btn-server-toggle-icon');
  dom.btnServerToggleText = document.getElementById('btn-server-toggle-text');
  dom.statUptime = document.getElementById('stat-uptime');
  dom.statClients = document.getElementById('stat-clients');
  dom.statPort = document.getElementById('stat-port');
  dom.statHost = document.getElementById('stat-host');
  dom.sysOs = document.getElementById('sys-os');
  dom.sysHostname = document.getElementById('sys-hostname');
  dom.sysCpu = document.getElementById('sys-cpu');
  dom.sysCores = document.getElementById('sys-cores');
  dom.sysTotalmem = document.getElementById('sys-totalmem');
  dom.sysMemusage = document.getElementById('sys-memusage');
  dom.networkInfoList = document.getElementById('network-info-list');

  // Connections
  dom.clientsContainer = document.getElementById('clients-container');
  dom.clientsCountText = document.getElementById('clients-count-text');

  // Logs
  dom.logEntries = document.getElementById('log-entries');
  dom.logCount = document.getElementById('log-count');
  dom.logSearch = document.getElementById('log-search');
  dom.logFilterBtns = document.querySelectorAll('.log-filter-btn');
  dom.btnClearLogs = document.getElementById('btn-clear-logs');

  // Settings
  dom.settingPort = document.getElementById('setting-port');
  dom.settingHost = document.getElementById('setting-host');
  dom.settingPassword = document.getElementById('setting-password');
  dom.settingAutoStart = document.getElementById('setting-autoStart');
  dom.settingMinimizeToTray = document.getElementById('setting-minimizeToTray');

  // Status bar
  dom.statusbarDot = document.getElementById('statusbar-dot');
  dom.statusbarStatus = document.getElementById('statusbar-status');
  dom.statusbarClients = document.getElementById('statusbar-clients');
  dom.statusbarPort = document.getElementById('statusbar-port');
  dom.statusbarUptime = document.getElementById('statusbar-uptime');

  // Toast
  dom.toastContainer = document.getElementById('toast-container');
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.25s ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function switchPage(pageId) {
  state.currentPage = pageId;

  dom.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  dom.pages.forEach(page => {
    page.classList.toggle('active', page.id === `page-${pageId}`);
  });

  // Refresh page data
  if (pageId === 'dashboard') refreshDashboard();
  if (pageId === 'connections') refreshConnections();
  if (pageId === 'logs') refreshLogs();
  if (pageId === 'settings') refreshSettings();
}

// ─── Server Toggle ────────────────────────────────────────────────────────────
async function toggleServer() {
  dom.btnServerToggle.disabled = true;

  try {
    if (state.serverRunning) {
      const result = await window.api.stopServer();
      if (result.success) {
        showToast('服务器已停止', 'success');
      } else {
        showToast(result.message || '停止失败', 'error');
      }
    } else {
      // Read config from settings form, not from dashboard stats
      const config = {
        port: parseInt(dom.settingPort.value) || 9527,
        host: dom.settingHost.value || '0.0.0.0',
        password: dom.settingPassword?.value || '',
      };
      const result = await window.api.startServer(config);
      if (result.success) {
        showToast('服务器已启动', 'success');
      } else {
        showToast(result.message || '启动失败', 'error');
      }
    }
  } catch (err) {
    showToast(`操作失败: ${err.message}`, 'error');
  } finally {
    dom.btnServerToggle.disabled = false;
    refreshStatus();
  }
}

// ─── Status Updates ───────────────────────────────────────────────────────────
async function refreshStatus() {
  try {
    const status = await window.api.getServerStatus();
    state.serverRunning = status.isRunning;

    // Update dashboard status
    updateServerStatusUI(status);

    // Update sidebar
    dom.sidebarStatusDot.className = `status-dot ${status.isRunning ? 'running' : ''}`;
    dom.sidebarStatusText.textContent = status.isRunning ? '服务运行中' : '服务未运行';

    // Update status bar
    dom.statusbarDot.className = `statusbar-dot ${status.isRunning ? 'running' : ''}`;
    dom.statusbarStatus.textContent = status.isRunning ? '服务运行中' : '服务未运行';
    dom.statusbarClients.textContent = `${status.clientCount} 个客户端`;
    dom.statusbarPort.textContent = `端口: ${status.config?.port || 9527}`;

    // Update dashboard stats
    dom.statClients.textContent = status.clientCount;
    dom.statPort.textContent = status.config?.port || 9527;
    dom.statHost.textContent = status.config?.host || '0.0.0.0';

    // Update client badge
    if (status.clientCount > 0) {
      dom.clientBadge.style.display = 'inline';
      dom.clientBadge.textContent = status.clientCount;
    } else {
      dom.clientBadge.style.display = 'none';
    }

    // Update uptime
    if (status.isRunning && status.uptimeFormatted) {
      dom.statUptime.textContent = status.uptimeFormatted;
      dom.statusbarUptime.textContent = formatTime(status.uptime);
    } else {
      dom.statUptime.textContent = '0s';
      dom.statusbarUptime.textContent = '00:00:00';
    }
  } catch (err) {
    console.error('刷新状态失败:', err);
  }
}

function updateServerStatusUI(status) {
  if (status.isRunning) {
    dom.dashStatusIcon.className = 'status-icon running';
    dom.dashStatusIcon.textContent = '▶';
    dom.dashStatusLabel.className = 'status-label running';
    dom.dashStatusLabel.textContent = '服务运行中';
    dom.dashStatusSub.textContent = `${status.config?.host || '0.0.0.0'}:${status.config?.port || 9527}`;

    dom.btnServerToggle.className = 'server-toggle-btn stop';
    dom.btnServerToggleIcon.textContent = '⏹';
    dom.btnServerToggleText.textContent = '停止服务';
  } else {
    dom.dashStatusIcon.className = 'status-icon stopped';
    dom.dashStatusIcon.textContent = '⏹';
    dom.dashStatusLabel.className = 'status-label stopped';
    dom.dashStatusLabel.textContent = '服务未运行';
    dom.dashStatusSub.textContent = '点击下方按钮启动服务器';

    dom.btnServerToggle.className = 'server-toggle-btn start';
    dom.btnServerToggleIcon.textContent = '▶';
    dom.btnServerToggleText.textContent = '启动服务';
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function refreshDashboard() {
  await refreshStatus();

  try {
    const sysInfo = await window.api.getSystemInfo();
    if (sysInfo) {
      dom.sysOs.textContent = `${sysInfo.os} ${sysInfo.osVersion || ''}`;
      dom.sysHostname.textContent = sysInfo.hostname;
      dom.sysCpu.textContent = sysInfo.cpu?.model ? sysInfo.cpu.model.substring(0, 40) : '--';
      dom.sysCores.textContent = sysInfo.cpu?.cores || '--';
      dom.sysTotalmem.textContent = formatBytes(sysInfo.memory?.total || 0);
      dom.sysMemusage.textContent = sysInfo.memory?.usagePercent
        ? `${sysInfo.memory.usagePercent}% (${formatBytes(sysInfo.memory.used)} / ${formatBytes(sysInfo.memory.total)})`
        : '--';

      // Network info
      const nets = sysInfo.network || [];
      dom.networkInfoList.innerHTML = nets.map(n => `
        <div class="network-item">
          <span class="network-interface">${n.interface}</span>
          <span class="network-ip">${n.ip}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('刷新仪表盘失败:', err);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── Connections ──────────────────────────────────────────────────────────────
async function refreshConnections() {
  try {
    state.clients = await window.api.getClients();
    dom.clientsCountText.textContent = `(${state.clients.length})`;

    if (state.clients.length === 0) {
      dom.clientsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔗</div>
          <div class="empty-state-text">暂无连接的客户端</div>
          <div class="empty-state-sub">启动服务器后，客户端可通过 WebSocket 连接</div>
        </div>
      `;
      return;
    }

    dom.clientsContainer.innerHTML = `
      <table class="clients-table">
        <thead>
          <tr>
            <th>客户端 ID</th>
            <th>IP 地址</th>
            <th>连接时间</th>
            <th>认证状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${state.clients.map(c => `
            <tr>
              <td><span class="client-id">${escapeHtml(c.id.substring(0, 12))}...</span></td>
              <td>${escapeHtml(c.ip || 'unknown')}</td>
              <td>${formatDateTime(c.connectedAt)}</td>
              <td>
                <span class="auth-badge ${c.authenticated ? 'authenticated' : 'unauthenticated'}">
                  ${c.authenticated ? '✓ 已认证' : '⏳ 未认证'}
                </span>
              </td>
              <td>
                <button class="btn-disconnect" data-client-id="${escapeHtml(c.id)}">断开</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('刷新连接列表失败:', err);
  }
}

async function disconnectClient(id) {
  try {
    const result = await window.api.disconnectClient(id);
    if (result.success) {
      showToast('已断开客户端', 'success');
      refreshConnections();
      refreshStatus();
    } else {
      showToast(result.message || '断开失败', 'error');
    }
  } catch (err) {
    showToast(`断开失败: ${err.message}`, 'error');
  }
}

// disconnectClient is called via event delegation

// ─── Logs ─────────────────────────────────────────────────────────────────────
async function refreshLogs() {
  try {
    state.logs = await window.api.getLogs(state.logFilter !== 'all' ? state.logFilter : null);
    renderLogs();
  } catch (err) {
    console.error('刷新日志失败:', err);
  }
}

function renderLogs() {
  let filteredLogs = state.logs;

  // Apply search filter
  if (state.logSearch) {
    const search = state.logSearch.toLowerCase();
    filteredLogs = filteredLogs.filter(l =>
      l.message.toLowerCase().includes(search) ||
      l.level.toLowerCase().includes(search)
    );
  }

  if (filteredLogs.length === 0) {
    dom.logEntries.innerHTML = `
      <div class="empty-state" style="padding: 32px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无日志记录</div>
        <div class="empty-state-sub">服务器运行后日志将在此显示</div>
      </div>
    `;
  } else {
    // Only render last 200 entries for performance
    const displayLogs = filteredLogs.slice(-200);
    dom.logEntries.innerHTML = displayLogs.map(log => `
      <div class="log-entry">
        <span class="log-time">${formatTimestamp(log.timestamp)}</span>
        <span class="log-level ${log.level}">${log.level}</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      </div>
    `).join('');

    // Auto-scroll to bottom
    dom.logEntries.scrollTop = dom.logEntries.scrollHeight;
  }

  dom.logCount.textContent = `共 ${filteredLogs.length} 条日志${state.logFilter !== 'all' ? ` (筛选: ${state.logFilter})` : ''}`;
}

function addLogEntry(entry) {
  state.logs.push(entry);
  if (state.logs.length > 1000) {
    state.logs = state.logs.slice(-1000);
  }

  // Check if it passes the current filter
  if (state.logFilter !== 'all' && entry.level !== state.logFilter) return;
  if (state.logSearch && !entry.message.toLowerCase().includes(state.logSearch.toLowerCase())) return;

  // Append single entry to DOM (more efficient than re-rendering all)
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = `
    <span class="log-time">${formatTimestamp(entry.timestamp)}</span>
    <span class="log-level ${entry.level}">${entry.level}</span>
    <span class="log-message">${escapeHtml(entry.message)}</span>
  `;
  dom.logEntries.appendChild(div);

  // Keep max 200 entries in DOM
  while (dom.logEntries.children.length > 200) {
    dom.logEntries.removeChild(dom.logEntries.firstChild);
  }

  // Auto-scroll
  dom.logEntries.scrollTop = dom.logEntries.scrollHeight;

  // Update count
  const currentCount = state.logFilter !== 'all'
    ? state.logs.filter(l => l.level === state.logFilter).length
    : state.logs.length;
  dom.logCount.textContent = `共 ${currentCount} 条日志${state.logFilter !== 'all' ? ` (筛选: ${state.logFilter})` : ''}`;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
async function refreshSettings() {
  try {
    const config = await window.api.getConfig();
    dom.settingPort.value = config.port || 9527;
    dom.settingHost.value = config.host || '0.0.0.0';
    dom.settingPassword.value = config.password || '';
    dom.settingAutoStart.checked = !!config.autoStart;
    dom.settingMinimizeToTray.checked = config.minimizeToTray !== false;
  } catch (err) {
    console.error('刷新设置失败:', err);
  }
}

async function saveSettings() {
  try {
    const config = {
      port: parseInt(dom.settingPort.value) || 9527,
      host: dom.settingHost.value || '0.0.0.0',
      password: dom.settingPassword.value || '',
      autoStart: dom.settingAutoStart.checked,
      minimizeToTray: dom.settingMinimizeToTray.checked,
    };

    if (config.port < 1 || config.port > 65535) {
      showToast('端口号必须在 1-65535 之间', 'warning');
      return;
    }

    const success = await window.api.saveConfig(config);
    if (success) {
      showToast('设置已保存', 'success');
      refreshStatus();
    } else {
      showToast('保存设置失败', 'error');
    }
  } catch (err) {
    showToast(`保存失败: ${err.message}`, 'error');
  }
}

// saveSettings is called via addEventListener

function resetSettings() {
  dom.settingPort.value = 9527;
  dom.settingHost.value = '0.0.0.0';
  dom.settingPassword.value = '';
  dom.settingAutoStart.checked = false;
  dom.settingMinimizeToTray.checked = true;
  showToast('已恢复默认设置，请点击保存', 'info');
}

// resetSettings is called via addEventListener

// ─── Utilities ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimestamp(isoString) {
  if (!isoString) return '--:--:--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  } catch {
    return isoString.substring(11, 19) || '--:--:--';
  }
}

function formatDateTime(isoString) {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('zh-CN', { hour12: false });
  } catch {
    return isoString;
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
function setupEventListeners() {
  // Title bar controls
  dom.btnMinimize.addEventListener('click', () => {
    window.api.minimizeWindow();
  });

  dom.btnClose.addEventListener('click', () => {
    window.api.closeWindow();
  });

  // Sidebar navigation
  dom.navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchPage(item.dataset.page);
    });
  });

  // Log filter buttons
  dom.logFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.logFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.logFilter = btn.dataset.filter;
      refreshLogs();
    });
  });

  // Log search
  let searchDebounce;
  dom.logSearch.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.logSearch = dom.logSearch.value.trim();
      renderLogs();
    }, 300);
  });

  // Clear logs
  dom.btnClearLogs.addEventListener('click', async () => {
    try {
      await window.api.clearLogs();
      state.logs = [];
      renderLogs();
      showToast('日志已清空', 'success');
    } catch (err) {
      showToast('清空日志失败', 'error');
    }
  });

  // Server toggle button
  dom.btnServerToggle.addEventListener('click', toggleServer);

  // Settings buttons
  dom.btnSaveSettings = document.getElementById('btn-save-settings');
  dom.btnResetSettings = document.getElementById('btn-reset-settings');
  if (dom.btnSaveSettings) {
    dom.btnSaveSettings.addEventListener('click', saveSettings);
  }
  if (dom.btnResetSettings) {
    dom.btnResetSettings.addEventListener('click', resetSettings);
  }

  // Connections page: use event delegation for disconnect buttons
  dom.clientsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-disconnect');
    if (btn) {
      const clientId = btn.dataset.clientId;
      if (clientId) {
        disconnectClient(clientId);
      }
    }
  });

  // IPC events from main process
  window.api.onLogAdded((entry) => {
    addLogEntry(entry);
  });

  window.api.onClientConnected((client) => {
    state.clients.push(client);
    if (state.currentPage === 'connections') {
      refreshConnections();
    }
    refreshStatus();
  });

  window.api.onClientDisconnected((data) => {
    state.clients = state.clients.filter(c => c.id !== data.id);
    if (state.currentPage === 'connections') {
      refreshConnections();
    }
    refreshStatus();
  });
}

// ─── Periodic Updates ─────────────────────────────────────────────────────────
function startPeriodicUpdates() {
  // Update status every 2 seconds
  state.statusInterval = setInterval(() => {
    refreshStatus();
  }, 2000);
}

// ─── Initialization ───────────────────────────────────────────────────────────
async function init() {
  cacheDom();
  setupEventListeners();
  startPeriodicUpdates();

  // Load initial data
  await refreshDashboard();
  await refreshSettings();

  // Load initial logs
  try {
    state.logs = await window.api.getLogs();
    renderLogs();
  } catch (err) {
    console.error('加载初始日志失败:', err);
  }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
