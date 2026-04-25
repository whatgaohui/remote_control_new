/**
 * RC-Client: 远程控制客户端
 * 运行在控制端PC上，连接到服务端进行远程控制
 * 
 * 功能：
 * - 连接远程服务端
 * - 屏幕查看与交互
 * - 键盘/鼠标事件发送
 * - 文件管理（浏览、上传、下载）
 * - 进程查看
 * - 系统信息查看
 * - 剪贴板同步
 * - 音频流
 * - 远程终端
 */

// ─── 配置 ────────────────────────────────────────────────────────────────────
const VERSION = "1.0.0";

const args = process.argv.slice(2);
let serverHost = "";
let serverPort = 9527;
let serverPassword = "";
let command = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--host" && args[i + 1]) { serverHost = args[i + 1]; i++; }
  if (args[i] === "--port" && args[i + 1]) { serverPort = parseInt(args[i + 1]); i++; }
  if (args[i] === "--password" && args[i + 1]) { serverPassword = args[i + 1]; i++; }
  if (args[i] === "--command" && args[i + 1]) { command = args[i + 1]; i++; }
  if (args[i] === "--help" || args.length === 0) {
    console.log(`
RC-Client v${VERSION} - 远程控制客户端
用法: rc-client.exe [选项]

选项:
  --host <地址>      服务端地址 (必填)
  --port <端口>      服务端端口 (默认: 9527)
  --password <密码>  连接密码 (默认: 无)
  --command <命令>   执行单条命令后退出
  --help             显示帮助信息

交互命令:
  info              获取系统信息
  proc              获取进程列表
  files [路径]      浏览文件
  cmd <命令>        执行远程命令
  shell             进入远程终端
  ping              测试延迟
  quit / exit       退出

示例:
  rc-client.exe --host 192.168.1.100
  rc-client.exe --host 10.0.0.50 --port 8080 --password mypass
  rc-client.exe --host 192.168.1.100 --command "info"
`);
    process.exit(args.includes("--help") ? 0 : 1);
  }
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}天${h}小时`;
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
}

// ─── WebSocket 客户端 ────────────────────────────────────────────────────────
let ws: any = null;
let isConnected = false;
let isAuthenticated = false;
let shellMode = false;
let pingStart = 0;

function connect() {
  const url = `ws://${serverHost}:${serverPort}/ws`;
  log(`正在连接 ${url}...`);

  try {
    ws = new WebSocket(url);
  } catch (e) {
    log(`连接失败: ${e}`);
    process.exit(1);
  }

  ws.onopen = () => {
    isConnected = true;
    log(`已连接到服务端`);
  };

  ws.onmessage = (event: any) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (e) {
      // ignore
    }
  };

  ws.onclose = () => {
    isConnected = false;
    isAuthenticated = false;
    log(`连接已断开`);
    process.exit(0);
  };

  ws.onerror = (e: any) => {
    log(`连接错误: ${e}`);
    process.exit(1);
  };
}

function send(msg: any) {
  if (ws && isConnected) {
    ws.send(JSON.stringify(msg));
  }
}

function handleServerMessage(data: any) {
  switch (data.type) {
    case "welcome": {
      log(`服务端版本: ${data.serverVersion}`);
      if (data.requiresAuth) {
        log(`服务端需要密码认证，正在认证...`);
        send({ type: "auth", password: serverPassword });
      } else {
        isAuthenticated = true;
        log(`无需认证，已就绪`);
        if (command) {
          executeCommand(command);
        } else {
          showPrompt();
        }
      }
      break;
    }
    case "auth_ok": {
      isAuthenticated = true;
      log(`认证成功，已就绪`);
      if (command) {
        executeCommand(command);
      } else {
        showPrompt();
      }
      break;
    }
    case "auth_failed": {
      log(`认证失败: ${data.message}`);
      process.exit(1);
      break;
    }
    case "pong": {
      const latency = Date.now() - pingStart;
      log(`延迟: ${latency}ms`);
      if (!command) showPrompt();
      break;
    }
    case "system_info": {
      const si = data.data;
      log(``);
      log(`══════ 系统信息 ══════`);
      log(`  操作系统: ${si.os} ${si.osVersion}`);
      log(`  主机名:   ${si.hostname}`);
      log(`  运行时间: ${formatDuration(si.uptime * 1000)}`);
      log(`  CPU: ${si.cpu.model}`);
      log(`  CPU 核心: ${si.cpu.cores} | 使用率: ${si.cpu.usage}% | 温度: ${si.cpu.temperature}°C`);
      log(`  内存: ${formatBytes(si.memory.used)} / ${formatBytes(si.memory.total)} (${Math.round(si.memory.used / si.memory.total * 100)}%)`);
      if (si.network) {
        for (const n of si.network) {
          log(`  网络: ${n.interface} - ${n.ip}`);
        }
      }
      log(`══════════════════════`);
      log(``);
      if (command) { process.exit(0); } else { showPrompt(); }
      break;
    }
    case "processes": {
      const procs = data.data;
      log(``);
      log(`══════ 进程列表 (${procs.length}) ══════`);
      log(`  ${"PID".padEnd(8)} ${"名称".padEnd(25)} ${"CPU%".padEnd(8)} ${"内存%".padEnd(8)} ${"线程".padEnd(6)} 状态`);
      log(`  ${"─".repeat(65)}`);
      for (const p of procs) {
        log(`  ${String(p.pid).padEnd(8)} ${p.name.padEnd(25)} ${String(p.cpuUsage).padEnd(8)} ${String(p.memoryUsage).padEnd(8)} ${String(p.threads).padEnd(6)} ${p.status}`);
      }
      log(`════════════════════════════════════`);
      log(``);
      if (command) { process.exit(0); } else { showPrompt(); }
      break;
    }
    case "files": {
      const files = data.data;
      log(``);
      log(`══════ 文件列表: ${files.path} ══════`);
      for (const f of files.entries) {
        const icon = f.type === "folder" ? "📁" : "📄";
        const size = f.type === "folder" ? "" : formatBytes(f.size);
        log(`  ${icon} ${f.name.padEnd(30)} ${size.padStart(10)}  ${f.modified}`);
      }
      log(`════════════════════════════════════`);
      log(``);
      if (command) { process.exit(0); } else { showPrompt(); }
      break;
    }
    case "command_result": {
      log(``);
      log(`输出: ${data.output}`);
      log(`退出码: ${data.exitCode}`);
      log(``);
      if (command) { process.exit(data.exitCode); } else { showPrompt(); }
      break;
    }
    case "shell_output": {
      process.stdout.write(data.output);
      if (shellMode) showShellPrompt();
      break;
    }
    case "screen_frame": {
      log(`屏幕帧: ${data.data.width}x${data.data.height} quality=${data.data.quality}`);
      break;
    }
    case "clipboard_update": {
      log(`剪贴板更新: ${data.content?.substring(0, 100)}`);
      break;
    }
    case "audio_started": {
      log(`音频流已开始 (codec: ${data.codec})`);
      break;
    }
    case "audio_stopped": {
      log(`音频流已停止`);
      break;
    }
    case "error": {
      log(`错误: ${data.message}`);
      if (command) { process.exit(1); } else { showPrompt(); }
      break;
    }
    default: {
      log(`收到消息: ${data.type}`);
      if (!command) showPrompt();
    }
  }
}

function showPrompt() {
  if (shellMode) return;
  process.stdout.write(`rc> `);
}

function showShellPrompt() {
  process.stdout.write(`remote> `);
}

function executeCommand(cmd: string) {
  const parts = cmd.trim().split(/\s+/);
  const action = parts[0]?.toLowerCase();

  switch (action) {
    case "info":
      send({ type: "get_system_info" });
      break;
    case "proc":
    case "processes":
      send({ type: "get_processes" });
      break;
    case "files":
      send({ type: "get_files", path: parts[1] || "C:\\Users" });
      break;
    case "cmd":
      if (parts[1]) {
        send({ type: "command", command: parts.slice(1).join(" ") });
      } else {
        log(`用法: cmd <命令>`);
        if (command) process.exit(1); else showPrompt();
      }
      break;
    case "shell":
      shellMode = true;
      log(`进入远程终端模式 (输入 exit 退出)`);
      showShellPrompt();
      break;
    case "ping":
      pingStart = Date.now();
      send({ type: "ping" });
      break;
    case "quit":
    case "exit":
      if (shellMode) {
        shellMode = false;
        log(`已退出远程终端`);
        showPrompt();
      } else {
        log(`再见！`);
        process.exit(0);
      }
      break;
    default:
      if (shellMode) {
        send({ type: "shell_input", input: cmd });
      } else {
        log(`未知命令: ${action}。可用: info, proc, files, cmd, shell, ping, quit`);
        if (command) process.exit(1); else showPrompt();
      }
  }
}

// ─── 交互式输入 ──────────────────────────────────────────────────────────────
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on("line", (line: string) => {
  if (!line.trim()) { showPrompt(); return; }
  executeCommand(line);
});

rl.on("close", () => {
  if (ws) ws.close();
  process.exit(0);
});

// ─── 启动 ────────────────────────────────────────────────────────────────────
log(``);
log(`╔═══════════════════════════════════════════════════╗`);
log(`║          RC-Client v${VERSION}  远程控制客户端        ║`);
log(`╠═══════════════════════════════════════════════════╣`);
log(`║  服务端: ${serverHost}:${serverPort}                            ║`);
log(`║  密码:   ${serverPassword ? "已设置" : "未设置"}                                ║`);
log(`╚═══════════════════════════════════════════════════╝`);
log(``);

connect();
