/**
 * RC-Client GUI - Renderer Process
 * Handles UI interactions and IPC communication with main process
 */

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  isConnected: false,
  isConnecting: false,
  isAuthenticated: false,
  currentPage: 'connect',
  latency: 0,
  dataSent: 0,
  dataReceived: 0,
  uptime: 0,
  shellMode: false,
  currentPath: 'C:\\Users',
  systemInfo: null,
  processes: [],
  files: null,
  commandHistory: [],
  historyIndex: -1,
  settings: {
    defaultHost: '',
    defaultPort: 9527,
    defaultPassword: '',
    autoReconnect: false,
    reconnectInterval: 5000,
    theme: 'dark'
  }
};

// ─── DOM References ──────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Utility Functions ───────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}天${h}小时`;
  if (h > 0) return `${h}小时${m}分`;
  if (m > 0) return `${m}分${sec}秒`;
  return `${sec}秒`;
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Toast Notifications ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function navigateTo(page) {
  state.currentPage = page;

  // Update nav items
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Show/hide pages
  $$('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  // Auto-load data when navigating to certain pages
  if (page === 'system' && state.isConnected && state.isAuthenticated && !state.systemInfo) {
    refreshSystemInfo();
  }
  if (page === 'processes' && state.isConnected && state.isAuthenticated && state.processes.length === 0) {
    refreshProcesses();
  }
  if (page === 'files' && state.isConnected && state.isAuthenticated && !state.files) {
    refreshFiles();
  }
}

// ─── Connection UI ───────────────────────────────────────────────────────────
function updateConnectionUI() {
  const dotClass = state.isConnected ? 'connected' : (state.isConnecting ? 'connecting' : '');
  const statusText = state.isConnected ? '已连接' : (state.isConnecting ? '连接中...' : '未连接');
  const statusColor = state.isConnected ? 'var(--success)' : (state.isConnecting ? 'var(--warning)' : 'var(--danger)');

  // Sidebar dot
  const sidebarDot = $('#sidebar-dot');
  sidebarDot.className = `connection-dot ${dotClass}`;
  $('#sidebar-status').textContent = state.isAuthenticated ? '已认证' : statusText;

  // Connection bar
  const connBarDot = $('#conn-bar-dot');
  connBarDot.className = `dot ${dotClass}`;
  $('#conn-bar-status-text').textContent = statusText;
  $('#conn-bar-address').textContent = state.isConnected ? `${state.settings.defaultHost || '—'}:${state.settings.defaultPort}` : '—';

  // Connection bar buttons
  $('#conn-bar-ping').disabled = !state.isConnected;
  $('#conn-bar-connect').textContent = state.isConnected ? '✕ 断开' : '🔗 连接';
  $('#conn-bar-connect').className = state.isConnected ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-primary';

  // Connect page buttons
  $('#btn-connect').style.display = (state.isConnected || state.isConnecting) ? 'none' : 'flex';
  $('#btn-disconnect').style.display = state.isConnected ? 'flex' : 'none';

  // Connect animation
  const anim = $('#connect-animation');
  const form = $('#connect-form');
  if (state.isConnecting) {
    anim.classList.add('active');
    form.style.display = 'none';
  } else {
    anim.classList.remove('active');
    form.style.display = 'block';
  }

  // Status bar
  $('#status-dot').style.color = statusColor;
  $('#status-connection').textContent = statusText;
  $('#status-latency').textContent = state.latency > 0 ? `${state.latency} ms` : '— ms';

  // Terminal connection status
  const termConnStatus = $('#terminal-conn-status');
  if (state.isConnected && state.isAuthenticated) {
    termConnStatus.textContent = '● 已连接';
    termConnStatus.style.color = 'var(--success)';
  } else if (state.isConnecting) {
    termConnStatus.textContent = '● 连接中';
    termConnStatus.style.color = 'var(--warning)';
  } else {
    termConnStatus.textContent = '● 未连接';
    termConnStatus.style.color = 'var(--danger)';
  }
}

function updateConnectSteps(step) {
  const steps = ['step-tcp', 'step-ws', 'step-auth', 'step-ready'];
  const stepIdx = steps.indexOf(step);

  steps.forEach((id, idx) => {
    const el = $(`#${id}`);
    el.classList.remove('done', 'active');
    if (idx < stepIdx) {
      el.classList.add('done');
    } else if (idx === stepIdx) {
      el.classList.add('active');
    }
  });

  const texts = ['正在建立TCP连接...', '正在WebSocket握手...', '正在身份验证...', '连接就绪！'];
  if (stepIdx >= 0 && stepIdx < texts.length) {
    $('#connect-anim-text').textContent = texts[stepIdx];
  }
}

// ─── Connection Actions ──────────────────────────────────────────────────────
async function connectToServer() {
  const host = $('#input-host').value.trim();
  const port = parseInt($('#input-port').value) || 9527;
  const password = $('#input-password').value;

  if (!host) {
    showToast('请输入服务器地址', 'warning');
    $('#input-host').focus();
    return;
  }

  state.isConnecting = true;
  updateConnectionUI();
  updateConnectSteps('step-tcp');

  try {
    const result = await window.api.connect({ host, port, password });
    if (!result.success) {
      state.isConnecting = false;
      updateConnectionUI();
      showToast(`连接失败: ${result.error}`, 'error');
    }
  } catch (e) {
    state.isConnecting = false;
    updateConnectionUI();
    showToast(`连接异常: ${e.message}`, 'error');
  }
}

async function disconnectFromServer() {
  try {
    await window.api.disconnect();
    state.isConnected = false;
    state.isAuthenticated = false;
    state.isConnecting = false;
    state.shellMode = false;
    state.systemInfo = null;
    state.processes = [];
    state.files = null;
    updateConnectionUI();
    showToast('已断开连接', 'info');
  } catch (e) {
    showToast(`断开失败: ${e.message}`, 'error');
  }
}

// ─── System Info ─────────────────────────────────────────────────────────────
async function refreshSystemInfo() {
  if (!state.isConnected || !state.isAuthenticated) {
    showToast('请先连接并认证', 'warning');
    return;
  }
  try {
    await window.api.sendCommand('get_system_info');
    showToast('正在获取系统信息...', 'info');
  } catch (e) {
    showToast(`请求失败: ${e.message}`, 'error');
  }
}

function renderSystemInfo(data) {
  state.systemInfo = data;
  const si = data;
  const cpuPercent = si.cpu ? si.cpu.usage : 0;
  const memPercent = si.memory ? Math.round(si.memory.used / si.memory.total * 100) : 0;
  const circumference = 2 * Math.PI * 48;
  const cpuOffset = circumference - (cpuPercent / 100) * circumference;

  let html = `
    <div class="grid-2">
      <!-- OS Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon cyan">💻</div>
          <div>
            <div class="card-title">操作系统</div>
            <div class="card-subtitle">${si.hostname || '—'}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="info-grid" style="grid-template-columns: 1fr;">
            <div class="info-item">
              <span class="info-label">系统</span>
              <span class="info-value">${si.os || '—'} ${si.osVersion || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">主机名</span>
              <span class="info-value">${si.hostname || '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">运行时间</span>
              <span class="info-value">${si.uptime ? formatDuration(si.uptime * 1000) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CPU Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon teal">🔥</div>
          <div>
            <div class="card-title">CPU</div>
            <div class="card-subtitle">${si.cpu ? si.cpu.model : '—'}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="cpu-gauge-container">
            <div class="cpu-gauge">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle class="cpu-gauge-bg" cx="60" cy="60" r="48"/>
                <circle class="cpu-gauge-fill" cx="60" cy="60" r="48"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${cpuOffset}"/>
              </svg>
              <div class="cpu-gauge-text">
                <div class="cpu-gauge-value">${cpuPercent}%</div>
                <div class="cpu-gauge-label">CPU使用率</div>
              </div>
            </div>
          </div>
          <div class="info-grid" style="grid-template-columns: 1fr;">
            <div class="info-item">
              <span class="info-label">核心数</span>
              <span class="info-value">${si.cpu ? si.cpu.cores : '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">温度</span>
              <span class="info-value">${si.cpu ? si.cpu.temperature + '°C' : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Memory Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon amber">🧠</div>
          <div>
            <div class="card-title">内存</div>
            <div class="card-subtitle">${si.memory ? formatBytes(si.memory.total) : '—'}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="usage-bar-container">
            <div class="usage-bar">
              <div class="usage-bar-fill ${memPercent > 80 ? 'red' : memPercent > 60 ? 'amber' : 'cyan'}" style="width: ${memPercent}%"></div>
            </div>
            <div class="usage-stats">
              <span class="used">${si.memory ? formatBytes(si.memory.used) : '—'}</span>
              <span class="total">${si.memory ? formatBytes(si.memory.total) : '—'}</span>
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">使用率</span>
            <span class="info-value">${memPercent}%</span>
          </div>
        </div>
      </div>

      <!-- Network Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon green">🌐</div>
          <div>
            <div class="card-title">网络</div>
            <div class="card-subtitle">${si.network ? si.network.length + ' 个接口' : '—'}</div>
          </div>
        </div>
        <div class="card-body">
          ${si.network ? si.network.map(n => `
            <div class="network-item">
              <span class="network-iface">${n.interface}</span>
              <span class="network-ip">${n.ip}</span>
            </div>
          `).join('') : '<div class="text-muted">无网络信息</div>'}
        </div>
      </div>
    </div>

    <!-- Disk Card (full width) -->
    ${si.disk ? `
    <div class="card">
      <div class="card-header">
        <div class="card-icon cyan">💾</div>
        <div>
          <div class="card-title">磁盘</div>
          <div class="card-subtitle">${si.disk.length} 个磁盘</div>
        </div>
      </div>
      <div class="card-body">
        ${si.disk.map(d => {
          const dPercent = Math.round(d.used / d.total * 100);
          return `
            <div class="disk-item">
              <div class="disk-header">
                <span class="disk-name">${d.name || d.mount}</span>
                <span class="disk-usage">${formatBytes(d.used)} / ${formatBytes(d.total)} (${dPercent}%)</span>
              </div>
              <div class="usage-bar">
                <div class="usage-bar-fill ${dPercent > 90 ? 'red' : dPercent > 70 ? 'amber' : 'teal'}" style="width: ${dPercent}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}
  `;

  $('#system-info-content').innerHTML = html;
}

// ─── Processes ───────────────────────────────────────────────────────────────
async function refreshProcesses() {
  if (!state.isConnected || !state.isAuthenticated) {
    showToast('请先连接并认证', 'warning');
    return;
  }
  try {
    await window.api.sendCommand('get_processes');
    showToast('正在获取进程列表...', 'info');
  } catch (e) {
    showToast(`请求失败: ${e.message}`, 'error');
  }
}

function renderProcesses(procs) {
  state.processes = procs;

  // Apply search filter
  const searchTerm = ($('#process-search').value || '').toLowerCase();
  const filtered = searchTerm
    ? procs.filter(p => p.name.toLowerCase().includes(searchTerm) || String(p.pid).includes(searchTerm))
    : procs;

  if (filtered.length === 0) {
    $('#process-table-body').innerHTML = `
      <div class="empty-state" style="padding: 32px;">
        <div class="desc">没有匹配的进程</div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const p of filtered) {
    const cpuClass = p.cpuUsage > 50 ? 'high' : (p.cpuUsage > 10 ? 'medium' : 'low');
    const statusClass = p.status === 'running' ? 'status-running' : (p.status === 'stopped' ? 'status-stopped' : 'status-sleeping');

    html += `
      <div class="process-row">
        <div class="process-pid">${p.pid}</div>
        <div class="process-name">${escapeHtml(p.name)}</div>
        <div class="process-cpu ${cpuClass}" style="text-align: right;">${p.cpuUsage}%</div>
        <div class="process-mem" style="text-align: right;">${p.memoryUsage}%</div>
        <div class="process-threads" style="text-align: right;">${p.threads}</div>
        <div class="process-status ${statusClass}">${p.status}</div>
        <div class="process-kill">
          <button class="process-kill-btn" data-pid="${p.pid}" title="结束进程">✕</button>
        </div>
      </div>
    `;
  }
  $('#process-table-body').innerHTML = html;
}

async function killProcess(pid) {
  if (!confirm(`确定要结束进程 PID ${pid} 吗？`)) return;
  try {
    await window.api.sendCommand('kill_process', { pid });
    showToast(`已发送结束进程 PID ${pid} 的请求`, 'info');
    setTimeout(() => refreshProcesses(), 1000);
  } catch (e) {
    showToast(`操作失败: ${e.message}`, 'error');
  }
}

// ─── Files ───────────────────────────────────────────────────────────────────
async function refreshFiles(path) {
  if (!state.isConnected || !state.isAuthenticated) {
    showToast('请先连接并认证', 'warning');
    return;
  }
  const targetPath = path || state.currentPath;
  state.currentPath = targetPath;
  try {
    await window.api.sendCommand('get_files', { path: targetPath });
    showToast('正在获取文件列表...', 'info');
  } catch (e) {
    showToast(`请求失败: ${e.message}`, 'error');
  }
}

function renderFiles(data) {
  state.files = data;
  state.currentPath = data.path;

  // Update breadcrumb
  const parts = data.path.split(/[/\\]/).filter(Boolean);
  let breadcrumbHtml = '';
  parts.forEach((part, idx) => {
    if (idx > 0) breadcrumbHtml += '<span class="breadcrumb-sep">›</span>';
    const path = parts.slice(0, idx + 1).join('\\');
    if (idx === parts.length - 1) {
      breadcrumbHtml += `<span class="breadcrumb-current">${escapeHtml(part)}</span>`;
    } else {
      breadcrumbHtml += `<span class="breadcrumb-item" data-path="${escapeAttr(path)}">${escapeHtml(part)}</span>`;
    }
  });
  $('#files-breadcrumb').innerHTML = breadcrumbHtml;

  // Apply search filter
  const searchTerm = ($('#files-search').value || '').toLowerCase();
  const entries = data.entries || [];
  const filtered = searchTerm
    ? entries.filter(f => f.name.toLowerCase().includes(searchTerm))
    : entries;

  // Sort: folders first
  filtered.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  if (filtered.length === 0) {
    $('#files-list-body').innerHTML = `
      <div class="empty-state" style="padding: 32px;">
        <div class="desc">${searchTerm ? '没有匹配的文件' : '空目录'}</div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const f of filtered) {
    const icon = f.type === 'folder' ? '📁' : getFileIcon(f.name);
    const nameClass = f.type === 'folder' ? 'file-name folder' : 'file-name';
    const clickAttr = f.type === 'folder'
      ? `data-path="${escapeAttr(state.currentPath + '\\' + f.name)}"`
      : '';

    html += `
      <div class="files-list-row file-row" ${clickAttr}>
        <div class="file-icon">${icon}</div>
        <div class="${nameClass}">${escapeHtml(f.name)}</div>
        <div class="file-size">${f.type !== 'folder' ? formatBytes(f.size) : ''}</div>
        <div class="file-modified">${f.modified || ''}</div>
        <div class="file-type">${f.type === 'folder' ? '文件夹' : getExtension(f.name)}</div>
      </div>
    `;
  }
  $('#files-list-body').innerHTML = html;
}

function navigateToPath(path) {
  refreshFiles(path);
}

function getFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const icons = {
    txt: '📄', log: '📄', md: '📄', json: '📋', xml: '📋', yaml: '📋', yml: '📋',
    js: '📜', ts: '📜', py: '🐍', java: '☕', cpp: '⚡', c: '⚡', h: '⚡',
    exe: '⚙️', msi: '⚙️', dll: '⚙️', bat: '⚙️', cmd: '⚙️', ps1: '⚙️', sh: '⚙️',
    zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', svg: '🖼️', ico: '🖼️',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', ogg: '🎵',
    mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬', wmv: '🎬',
    pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙',
  };
  return icons[ext] || '📄';
}

function getExtension(name) {
  const ext = name.split('.').pop();
  return ext && ext !== name ? ext.toUpperCase() : '—';
}

// ─── Terminal ────────────────────────────────────────────────────────────────
function terminalPrint(text, type = 'output') {
  const body = $('#terminal-body');
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = text;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

function terminalPrintHtml(html, type = 'output') {
  const body = $('#terminal-body');
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.innerHTML = html;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

async function executeTerminalCommand(cmd) {
  if (!cmd.trim()) return;

  // Add to command history
  state.commandHistory.unshift(cmd);
  if (state.commandHistory.length > 100) state.commandHistory.pop();
  state.historyIndex = -1;

  // Echo the command
  terminalPrint(`${state.shellMode ? 'remote>' : 'rc>'} ${cmd}`, 'input');

  if (state.shellMode) {
    // In shell mode, send everything to remote
    if (cmd === 'exit') {
      state.shellMode = false;
      $('#terminal-prompt').textContent = 'rc>';
      terminalPrint('已退出远程终端模式', 'system');
      try {
        await window.api.sendCommand('shell_exit');
      } catch (e) { /* ignore */ }
      return;
    }
    try {
      await window.api.sendCommand('shell_input', { input: cmd });
    } catch (e) {
      terminalPrint(`发送失败: ${e.message}`, 'error');
    }
    return;
  }

  // Local command handling
  const parts = cmd.trim().split(/\s+/);
  const action = parts[0]?.toLowerCase();

  switch (action) {
    case 'help':
      terminalPrint('');
      terminalPrint('╔═══════════════════════════════════════════════════╗', 'system');
      terminalPrint('║  可用命令:                                        ║', 'system');
      terminalPrint('╠═══════════════════════════════════════════════════╣', 'system');
      terminalPrint('║  info              获取系统信息                    ║', 'system');
      terminalPrint('║  proc              获取进程列表                    ║', 'system');
      terminalPrint('║  files [路径]      浏览文件                        ║', 'system');
      terminalPrint('║  cmd <命令>        执行远程命令                    ║', 'system');
      terminalPrint('║  shell             进入远程终端模式                ║', 'system');
      terminalPrint('║  ping              测试延迟                        ║', 'system');
      terminalPrint('║  clear / cls       清屏                            ║', 'system');
      terminalPrint('║  help              显示帮助                        ║', 'system');
      terminalPrint('╚═══════════════════════════════════════════════════╝', 'system');
      terminalPrint('');
      break;

    case 'clear':
    case 'cls':
      clearTerminal();
      break;

    case 'info':
      if (!state.isConnected || !state.isAuthenticated) {
        terminalPrint('错误: 未连接或未认证', 'error');
      } else {
        try {
          await window.api.sendCommand('get_system_info');
        } catch (e) {
          terminalPrint(`请求失败: ${e.message}`, 'error');
        }
      }
      break;

    case 'proc':
    case 'processes':
      if (!state.isConnected || !state.isAuthenticated) {
        terminalPrint('错误: 未连接或未认证', 'error');
      } else {
        try {
          await window.api.sendCommand('get_processes');
        } catch (e) {
          terminalPrint(`请求失败: ${e.message}`, 'error');
        }
      }
      break;

    case 'files':
      if (!state.isConnected || !state.isAuthenticated) {
        terminalPrint('错误: 未连接或未认证', 'error');
      } else {
        const filePath = parts[1] || 'C:\\Users';
        try {
          await window.api.sendCommand('get_files', { path: filePath });
        } catch (e) {
          terminalPrint(`请求失败: ${e.message}`, 'error');
        }
      }
      break;

    case 'cmd':
      if (!parts[1]) {
        terminalPrint('用法: cmd <命令>', 'warning');
      } else if (!state.isConnected || !state.isAuthenticated) {
        terminalPrint('错误: 未连接或未认证', 'error');
      } else {
        try {
          await window.api.sendCommand('command', { command: parts.slice(1).join(' ') });
        } catch (e) {
          terminalPrint(`请求失败: ${e.message}`, 'error');
        }
      }
      break;

    case 'shell':
      if (!state.isConnected || !state.isAuthenticated) {
        terminalPrint('错误: 未连接或未认证', 'error');
      } else {
        state.shellMode = true;
        $('#terminal-prompt').textContent = 'remote>';
        terminalPrint('进入远程终端模式 (输入 exit 退出)', 'success');
      }
      break;

    case 'ping':
      if (!state.isConnected) {
        terminalPrint('错误: 未连接', 'error');
      } else {
        terminalPrint('正在测试延迟...', 'system');
        try {
          await window.api.sendCommand('ping');
        } catch (e) {
          terminalPrint(`请求失败: ${e.message}`, 'error');
        }
      }
      break;

    default:
      terminalPrint(`未知命令: ${action}。输入 help 查看可用命令`, 'warning');
  }
}

function clearTerminal() {
  const body = $('#terminal-body');
  body.innerHTML = '';
}

// ─── Settings ────────────────────────────────────────────────────────────────
async function loadSettings() {
  try {
    const config = await window.api.getConfig();
    state.settings = { ...state.settings, ...config };

    // Apply to form
    $('#setting-host').value = config.defaultHost || '';
    $('#setting-port').value = config.defaultPort || 9527;
    $('#setting-password').value = config.defaultPassword || '';
    $('#setting-reconnect-interval').value = config.reconnectInterval || 5000;
    $('#setting-theme').value = config.theme || 'dark';

    // Toggle
    const toggle = $('#setting-auto-reconnect');
    toggle.classList.toggle('active', !!config.autoReconnect);

    // Pre-fill connect form
    if (config.defaultHost) {
      $('#input-host').value = config.defaultHost;
    }
    if (config.defaultPort) {
      $('#input-port').value = config.defaultPort;
    }
    if (config.defaultPassword) {
      $('#input-password').value = config.defaultPassword;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function saveSettings() {
  const config = {
    defaultHost: $('#setting-host').value.trim(),
    defaultPort: parseInt($('#setting-port').value) || 9527,
    defaultPassword: $('#setting-password').value,
    autoReconnect: $('#setting-auto-reconnect').classList.contains('active'),
    reconnectInterval: parseInt($('#setting-reconnect-interval').value) || 5000,
    theme: $('#setting-theme').value
  };

  try {
    await window.api.saveConfig(config);
    state.settings = config;
    showToast('设置已保存', 'success');
  } catch (e) {
    showToast(`保存失败: ${e.message}`, 'error');
  }
}

function resetSettings() {
  $('#setting-host').value = '';
  $('#setting-port').value = 9527;
  $('#setting-password').value = '';
  $('#setting-auto-reconnect').classList.remove('active');
  $('#setting-reconnect-interval').value = 5000;
  $('#setting-theme').value = 'dark';
  showToast('设置已重置（点击保存生效）', 'info');
}

// ─── Connection History ──────────────────────────────────────────────────────
async function loadConnectionHistory() {
  try {
    const history = await window.api.getConnectionHistory();
    renderConnectionHistory(history);
  } catch (e) {
    console.error('Failed to load history:', e);
  }
}

function renderConnectionHistory(history) {
  const container = $('#history-list');
  if (!history || history.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <div class="desc">暂无连接历史</div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const h of history.slice(0, 5)) {
    html += `
      <div class="history-item" data-host="${escapeAttr(h.host)}" data-port="${h.port}" data-has-password="${!!h.password}">
        <div style="color: var(--accent); font-size: 16px;">🔗</div>
        <div>
          <div class="host">${escapeHtml(h.host)}:${h.port}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${h.password ? '🔐 需要密码' : '无密码'}</div>
        </div>
        <div class="time">${formatTime(h.lastConnected)}</div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function reconnectFromHistory(host, port, hasPassword) {
  $('#input-host').value = host;
  $('#input-port').value = port;
  if (!hasPassword) {
    $('#input-password').value = '';
  }
  showToast('已填入历史连接信息', 'info');
}

// ─── HTML Escape ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ─── IPC Event Handlers ──────────────────────────────────────────────────────
function setupIpcHandlers() {
  window.api.onConnected((data) => {
    state.isConnected = true;
    state.isConnecting = false;
    updateConnectSteps('step-ws');
    setTimeout(() => updateConnectSteps('step-auth'), 500);
    updateConnectionUI();
    showToast(`已连接到 ${data.host}:${data.port}`, 'success');
  });

  window.api.onConnectionStatus((data) => {
    if (data.status === 'connecting') {
      state.isConnecting = true;
      updateConnectSteps('step-tcp');
      updateConnectionUI();
    }
  });

  window.api.onAuthenticated((data) => {
    state.isAuthenticated = true;
    updateConnectSteps('step-ready');
    setTimeout(() => {
      state.isConnecting = false;
      updateConnectionUI();
    }, 800);
    showToast(data.requiresAuth ? '认证成功' : '已连接（无需认证）', 'success');
    loadConnectionHistory();
  });

  window.api.onAuthFailed((data) => {
    state.isAuthenticated = false;
    state.isConnecting = false;
    updateConnectionUI();
    showToast(`认证失败: ${data.message}`, 'error');
    terminalPrint(`认证失败: ${data.message}`, 'error');
  });

  window.api.onDisconnected((data) => {
    state.isConnected = false;
    state.isAuthenticated = false;
    state.isConnecting = false;
    state.shellMode = false;
    updateConnectionUI();
    showToast(`连接已断开 (code: ${data.code})`, 'warning');
    terminalPrint('连接已断开', 'warning');
  });

  window.api.onConnectionError((data) => {
    state.isConnecting = false;
    updateConnectionUI();
    showToast(`连接错误: ${data.message}`, 'error');
    terminalPrint(`连接错误: ${data.message}`, 'error');
  });

  window.api.onPong((data) => {
    state.latency = data.latency;
    $('#status-latency').textContent = `${data.latency} ms`;
  });

  window.api.onStatusUpdate((data) => {
    state.latency = data.latency;
    state.dataSent = data.dataSent;
    state.dataReceived = data.dataReceived;
    state.uptime = data.uptime;

    $('#status-latency').textContent = data.latency > 0 ? `${data.latency} ms` : '— ms';
    $('#status-sent').textContent = formatBytes(data.dataSent);
    $('#status-received').textContent = formatBytes(data.dataReceived);
  });

  window.api.onServerMessage((data) => {
    handleServerMessage(data);
  });
}

function handleServerMessage(data) {
  switch (data.type) {
    case 'system_info': {
      renderSystemInfo(data.data);
      // Also print in terminal if on terminal page
      if (state.currentPage === 'terminal') {
        const si = data.data;
        terminalPrint('');
        terminalPrint('══════ 系统信息 ══════', 'success');
        terminalPrint(`  操作系统: ${si.os} ${si.osVersion}`, 'output');
        terminalPrint(`  主机名:   ${si.hostname}`, 'output');
        terminalPrint(`  运行时间: ${formatDuration(si.uptime * 1000)}`, 'output');
        terminalPrint(`  CPU: ${si.cpu.model}`, 'output');
        terminalPrint(`  CPU 核心: ${si.cpu.cores} | 使用率: ${si.cpu.usage}% | 温度: ${si.cpu.temperature}°C`, 'output');
        terminalPrint(`  内存: ${formatBytes(si.memory.used)} / ${formatBytes(si.memory.total)} (${Math.round(si.memory.used / si.memory.total * 100)}%)`, 'output');
        if (si.network) {
          for (const n of si.network) {
            terminalPrint(`  网络: ${n.interface} - ${n.ip}`, 'output');
          }
        }
        terminalPrint('══════════════════════', 'success');
        terminalPrint('');
      }
      showToast('系统信息已更新', 'success');
      break;
    }

    case 'processes': {
      renderProcesses(data.data);
      if (state.currentPage === 'terminal') {
        const procs = data.data;
        terminalPrint('');
        terminalPrint(`══════ 进程列表 (${procs.length}) ══════`, 'success');
        for (const p of procs.slice(0, 20)) {
          terminalPrint(`  ${String(p.pid).padEnd(8)} ${p.name.padEnd(25)} CPU:${String(p.cpuUsage + '%').padEnd(8)} 内存:${p.memoryUsage}%`, 'output');
        }
        if (procs.length > 20) {
          terminalPrint(`  ... 还有 ${procs.length - 20} 个进程`, 'system');
        }
        terminalPrint('════════════════════════════════════', 'success');
        terminalPrint('');
      }
      showToast(`已获取 ${data.data.length} 个进程`, 'success');
      break;
    }

    case 'files': {
      renderFiles(data.data);
      if (state.currentPage === 'terminal') {
        const files = data.data;
        terminalPrint('');
        terminalPrint(`══════ 文件列表: ${files.path} ══════`, 'success');
        for (const f of files.entries) {
          const icon = f.type === 'folder' ? '📁' : '📄';
          const size = f.type === 'folder' ? '' : formatBytes(f.size);
          terminalPrint(`  ${icon} ${f.name.padEnd(30)} ${size.padStart(10)}`, 'output');
        }
        terminalPrint('════════════════════════════════════', 'success');
        terminalPrint('');
      }
      showToast('文件列表已更新', 'success');
      break;
    }

    case 'command_result': {
      if (data.output) {
        terminalPrint(data.output, 'output');
      }
      terminalPrint(`退出码: ${data.exitCode}`, data.exitCode === 0 ? 'success' : 'warning');
      break;
    }

    case 'shell_output': {
      if (data.output) {
        terminalPrint(data.output, 'output');
      }
      break;
    }

    case 'pong': {
      terminalPrint(`延迟: ${state.latency}ms`, 'success');
      break;
    }

    case 'error': {
      terminalPrint(`错误: ${data.message}`, 'error');
      showToast(`服务端错误: ${data.message}`, 'error');
      break;
    }

    case 'screen_frame': {
      // Could render frame data if we had a canvas
      if (state.currentPage === 'terminal') {
        terminalPrint(`屏幕帧: ${data.data.width}x${data.data.height} quality=${data.data.quality}`, 'system');
      }
      break;
    }

    default: {
      if (state.currentPage === 'terminal') {
        terminalPrint(`收到消息: ${data.type}`, 'system');
      }
    }
  }
}

// ─── Event Bindings ──────────────────────────────────────────────────────────
function setupEventListeners() {
  // Navigation
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
    });
  });

  // Window controls
  $('#btn-minimize').addEventListener('click', () => window.api.windowMinimize());
  $('#btn-maximize').addEventListener('click', () => window.api.windowMaximize());
  $('#btn-close').addEventListener('click', () => window.api.windowClose());

  // Connect/Disconnect buttons
  $('#btn-connect').addEventListener('click', connectToServer);
  $('#btn-disconnect').addEventListener('click', disconnectFromServer);

  // Connection bar buttons
  $('#conn-bar-connect').addEventListener('click', () => {
    if (state.isConnected) {
      disconnectFromServer();
    } else {
      navigateTo('connect');
    }
  });

  $('#conn-bar-ping').addEventListener('click', async () => {
    if (state.isConnected) {
      try {
        await window.api.sendCommand('ping');
        showToast('正在测试延迟...', 'info');
      } catch (e) { /* ignore */ }
    }
  });

  // Enter key on host input
  $('#input-host').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectToServer();
  });
  $('#input-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectToServer();
  });

  // System Info
  $('#btn-refresh-system').addEventListener('click', refreshSystemInfo);

  // Processes
  $('#btn-refresh-processes').addEventListener('click', refreshProcesses);
  $('#process-search').addEventListener('input', () => {
    if (state.processes.length > 0) {
      renderProcesses(state.processes);
    }
  });

  // Files
  $('#btn-files-refresh').addEventListener('click', () => refreshFiles());
  $('#btn-files-up').addEventListener('click', () => {
    const parent = state.currentPath.split(/[/\\]/).slice(0, -1).join('\\');
    if (parent) refreshFiles(parent);
  });
  $('#files-search').addEventListener('input', () => {
    if (state.files) renderFiles(state.files);
  });
  $('#btn-upload-file').addEventListener('click', () => {
    showToast('上传功能需要连接后使用', 'info');
  });
  $('#btn-download-file').addEventListener('click', () => {
    showToast('下载功能需要连接后使用', 'info');
  });

  // Terminal
  const terminalInput = $('#terminal-input');
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = terminalInput.value;
      terminalInput.value = '';
      executeTerminalCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state.commandHistory.length > 0) {
        state.historyIndex = Math.min(state.historyIndex + 1, state.commandHistory.length - 1);
        terminalInput.value = state.commandHistory[state.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.historyIndex > 0) {
        state.historyIndex--;
        terminalInput.value = state.commandHistory[state.historyIndex];
      } else {
        state.historyIndex = -1;
        terminalInput.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion
      const val = terminalInput.value.trim().toLowerCase();
      const commands = ['info', 'proc', 'files', 'cmd', 'shell', 'ping', 'clear', 'cls', 'help', 'exit'];
      const match = commands.find(c => c.startsWith(val));
      if (match) {
        terminalInput.value = match;
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clearTerminal();
    }
  });

  $('#btn-terminal-clear').addEventListener('click', clearTerminal);

  $('#btn-terminal-shell').addEventListener('click', () => {
    if (state.isConnected && state.isAuthenticated) {
      state.shellMode = !state.shellMode;
      $('#terminal-prompt').textContent = state.shellMode ? 'remote>' : 'rc>';
      if (state.shellMode) {
        terminalPrint('进入远程终端模式 (输入 exit 退出)', 'success');
      } else {
        terminalPrint('已退出远程终端模式', 'system');
      }
    } else {
      showToast('请先连接并认证', 'warning');
    }
  });

  // Screen
  $('#btn-screenshot').addEventListener('click', () => {
    if (state.isConnected && state.isAuthenticated) {
      showToast('截图功能开发中...', 'info');
    } else {
      showToast('请先连接', 'warning');
    }
  });
  $('#btn-fullscreen').addEventListener('click', () => {
    showToast('全屏功能开发中...', 'info');
  });

  // Settings
  $('#setting-auto-reconnect').addEventListener('click', function() {
    this.classList.toggle('active');
  });

  $('#btn-save-settings').addEventListener('click', saveSettings);
  $('#btn-reset-settings').addEventListener('click', resetSettings);

  // ─── Event delegation for dynamically generated elements ────────────────
  // Process kill buttons (data-pid)
  document.addEventListener('click', (e) => {
    const killBtn = e.target.closest('.process-kill-btn');
    if (killBtn) {
      const pid = parseInt(killBtn.dataset.pid);
      if (pid) killProcess(pid);
      return;
    }

    // History items (data-host, data-port)
    const historyItem = e.target.closest('.history-item');
    if (historyItem) {
      const host = historyItem.dataset.host;
      const port = parseInt(historyItem.dataset.port) || 9527;
      const hasPassword = historyItem.dataset.hasPassword === 'true';
      if (host) reconnectFromHistory(host, port, hasPassword);
      return;
    }

    // Breadcrumb items (data-path)
    const breadcrumbItem = e.target.closest('.breadcrumb-item');
    if (breadcrumbItem && breadcrumbItem.dataset.path) {
      navigateToPath(breadcrumbItem.dataset.path);
      return;
    }

    // File rows (data-path for folders)
    const fileRow = e.target.closest('.file-row');
    if (fileRow && fileRow.dataset.path) {
      navigateToPath(fileRow.dataset.path);
      return;
    }
  });
}

// ─── Initialization ──────────────────────────────────────────────────────────
async function init() {
  setupEventListeners();
  setupIpcHandlers();
  await loadSettings();
  await loadConnectionHistory();
  updateConnectionUI();

  // Focus terminal input when terminal page is active
  const observer = new MutationObserver(() => {
    const termPage = $('#page-terminal');
    if (termPage && termPage.classList.contains('active')) {
      $('#terminal-input').focus();
    }
  });

  $$('.page').forEach(page => {
    observer.observe(page, { attributes: true, attributeFilter: ['class'] });
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
