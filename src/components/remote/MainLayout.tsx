'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRemoteStore, formatBytes, formatDuration } from '@/lib/store';
import type { TabId } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard, Monitor, FolderOpen, ArrowUpDown, Clipboard, Activity,
  Cpu, Volume2, Terminal, FileText, Download, Settings,
  ChevronLeft, ChevronRight, Wifi, WifiOff, Clock, Zap,
  Upload, FolderPlus, List, LayoutGrid, File, Folder,
  ArrowUp, ArrowDown, Copy, Trash2, Search, SortAsc,
  MonitorOff, Speaker, VolumeX, Mic, MicOff,
  Camera, MousePointer2, RefreshCw, Power, Info,
  Shield, Bell, Keyboard, Github, CheckCircle2, XCircle,
  AlertTriangle, AlertCircle, Play, Pause, SkipForward,
  HardDrive, Globe, Thermometer, MemoryStick, Network,
  AppWindow, Command, Square, X, Maximize2, Minimize2,
  Lock, Eye, EyeOff, Signal, Radio, Server,
} from 'lucide-react';

// ─── Dark Card Helper ────────────────────────────────────────────────────
const darkCard = 'border-slate-800 bg-slate-900/80 backdrop-blur-sm text-white';
const darkInput = 'border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20';

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard; shortcut: string }[] = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, shortcut: 'Ctrl+1' },
  { id: 'screen', label: '屏幕', icon: Monitor, shortcut: 'Ctrl+2' },
  { id: 'files', label: '文件', icon: FolderOpen, shortcut: 'Ctrl+3' },
  { id: 'transfers', label: '传输', icon: ArrowUpDown, shortcut: 'Ctrl+4' },
  { id: 'clipboard', label: '剪贴板', icon: Clipboard, shortcut: 'Ctrl+5' },
  { id: 'processes', label: '进程', icon: Activity, shortcut: 'Ctrl+6' },
  { id: 'system', label: '系统', icon: Cpu, shortcut: 'Ctrl+7' },
  { id: 'audio', label: '音频', icon: Volume2, shortcut: 'Ctrl+8' },
  { id: 'terminal', label: '终端', icon: Terminal, shortcut: 'Ctrl+9' },
  { id: 'logs', label: '日志', icon: FileText, shortcut: 'Ctrl+0' },
  { id: 'download', label: '下载', icon: Download, shortcut: 'Ctrl+-' },
  { id: 'settings', label: '设置', icon: Settings, shortcut: 'Ctrl+=' },
];

const shortcutKeyMap: Record<string, TabId> = {
  '1': 'dashboard', '2': 'screen', '3': 'files', '4': 'transfers',
  '5': 'clipboard', '6': 'processes', '7': 'system', '8': 'audio',
  '9': 'terminal', '0': 'logs', '-': 'download', '=': 'settings',
};

// ─── Progress Bar Component (div-based) ───
function ProgressBar({ value, max = 100, className = '', colorClass = 'bg-emerald-500' }: { value: number; max?: number; className?: string; colorClass?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-2 w-full rounded-full bg-slate-700/50 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Mini Circular Gauge ───
function MiniGauge({ value, label, color, size = 100 }: { value: number; label: string; color: string; size?: number }) {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;
  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" className="text-slate-700/50" strokeWidth="7" />
        <motion.circle
          cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xl font-bold text-white">{value}%</span>
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
    </div>
  );
}

// ─── Animated Sparkline ───
function Sparkline({ data, color = '#10b981', height = 60 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const areaPoints = `0,${height} ${points} ${w},${height}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DashboardPanel() {
  const { systemInfo, latency, latencyHistory, operationLogs } = useRemoteStore();
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [netUpHistory, setNetUpHistory] = useState<number[]>([]);
  const [netDownHistory, setNetDownHistory] = useState<number[]>([]);
  const si = systemInfo;
  const cpuUsage = si?.cpu.usage ?? 0;
  const memUsage = si ? Math.round((si.memory.used / si.memory.total) * 100) : 0;
  const diskInfo = si?.disks[0];
  const diskUsage = diskInfo ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0;
  const netInfo = si?.network[0];

  const cpuColor = cpuUsage > 80 ? '#ef4444' : cpuUsage > 50 ? '#f59e0b' : '#10b981';
  const memColor = memUsage > 80 ? '#ef4444' : memUsage > 50 ? '#f59e0b' : '#f97316';

  // Simulate real-time chart data including network
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuHistory((prev) => [...prev.slice(-29), cpuUsage + (Math.random() - 0.5) * 10]);
      setMemHistory((prev) => [...prev.slice(-29), memUsage + (Math.random() - 0.5) * 5]);
      setNetUpHistory((prev) => [...prev.slice(-29), Math.random() * 5 + 1]);
      setNetDownHistory((prev) => [...prev.slice(-29), Math.random() * 15 + 5]);
    }, 2000);
    return () => clearInterval(interval);
  }, [cpuUsage, memUsage]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'CPU 使用率', value: `${cpuUsage}%`, icon: Cpu, color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/10' },
          { label: '内存使用', value: `${memUsage}%`, icon: MemoryStick, color: 'text-orange-400', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/10' },
          { label: '磁盘使用', value: `${diskUsage}%`, icon: HardDrive, color: 'text-cyan-400', bg: 'bg-cyan-500/10', glow: 'shadow-cyan-500/10' },
          { label: '网络延迟', value: `${latency}ms`, icon: Network, color: 'text-teal-400', bg: 'bg-teal-500/10', glow: 'shadow-teal-500/10' },
        ].map((stat) => (
          <motion.div key={stat.label} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
            <Card className={`${darkCard} shadow-lg ${stat.glow} transition-all duration-300 hover:border-slate-700`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Gauges and Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={`${darkCard} shadow-lg`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">CPU 仪表</CardTitle></CardHeader>
          <CardContent className="flex justify-center pt-0">
            <MiniGauge value={cpuUsage} label="CPU" color={cpuColor} size={110} />
          </CardContent>
        </Card>
        <Card className={`${darkCard} shadow-lg`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">内存仪表</CardTitle></CardHeader>
          <CardContent className="flex justify-center pt-0">
            <MiniGauge value={memUsage} label="内存" color={memColor} size={110} />
          </CardContent>
        </Card>
        <Card className={`${darkCard} shadow-lg`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">延迟趋势</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Sparkline data={latencyHistory.slice(-20)} color="#14b8a6" height={80} />
            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
              <span>{Math.min(...latencyHistory.slice(-20))}ms</span>
              <span>{Math.max(...latencyHistory.slice(-20))}ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CPU & Memory real-time charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={`${darkCard} shadow-lg`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-300">CPU 历史</CardTitle>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">{cpuUsage}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Sparkline data={cpuHistory} color={cpuColor} height={60} />
          </CardContent>
        </Card>
        <Card className={`${darkCard} shadow-lg`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-300">内存历史</CardTitle>
              <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px]">{memUsage}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Sparkline data={memHistory} color={memColor} height={60} />
          </CardContent>
        </Card>
      </div>

      {/* Network Throughput */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-300">网络吞吐量</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[10px] text-slate-400">上传</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-[10px] text-slate-400">下载</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-cyan-400" />
              <div>
                <p className="text-xs text-slate-500">上传速度</p>
                <p className="text-lg font-bold text-cyan-400">{(netUpHistory[netUpHistory.length - 1] ?? 0).toFixed(1)} MB/s</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-teal-400" />
              <div>
                <p className="text-xs text-slate-500">下载速度</p>
                <p className="text-lg font-bold text-teal-400">{(netDownHistory[netDownHistory.length - 1] ?? 0).toFixed(1)} MB/s</p>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Sparkline data={netUpHistory} color="#22d3ee" height={40} />
            <Sparkline data={netDownHistory} color="#2dd4bf" height={40} />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={`${darkCard} shadow-lg`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">最近活动</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {operationLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs py-1">
                    {log.severity === 'info' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> :
                     log.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" /> :
                     <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-slate-300">{log.detail}</p>
                      <p className="text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className={`${darkCard} shadow-lg`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">快捷操作</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '屏幕截图', icon: Camera, color: 'text-cyan-400', bg: 'hover:bg-cyan-500/10 hover:border-cyan-500/30' },
                { label: '重启远程', icon: RefreshCw, color: 'text-amber-400', bg: 'hover:bg-amber-500/10 hover:border-amber-500/30' },
                { label: '任务管理', icon: Activity, color: 'text-emerald-400', bg: 'hover:bg-emerald-500/10 hover:border-emerald-500/30' },
                { label: '系统信息', icon: Info, color: 'text-teal-400', bg: 'hover:bg-teal-500/10 hover:border-teal-500/30' },
              ].map((action) => (
                <Button key={action.label} variant="outline" className={`justify-start gap-2 h-9 text-xs border-slate-700 text-slate-300 ${action.bg} transition-all`}>
                  <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                  {action.label}
                </Button>
              ))}
            </div>
            {netInfo && (
              <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">接口</span><span className="text-slate-300">{netInfo.interface}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">IP</span><span className="text-slate-300">{netInfo.ip}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">速度</span><span className="text-slate-300">{netInfo.speed}</span></div>
                <Separator className="bg-slate-700" />
                <div className="flex justify-between"><span className="text-slate-500">发送</span><span className="text-cyan-400">{formatBytes(netInfo.sent)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">接收</span><span className="text-emerald-400">{formatBytes(netInfo.received)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCREEN PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SimWindow {
  id: string;
  title: string;
  icon: typeof Monitor;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  zIndex: number;
}

function ScreenPanel() {
  const { isScreenSharing, toggleScreenSharing } = useRemoteStore();
  const [resolution, setResolution] = useState('1920x1080');
  const [quality, setQuality] = useState('high');
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [windows, setWindows] = useState<SimWindow[]>([
    { id: '1', title: '文件管理器', icon: FolderOpen, x: 15, y: 10, w: 40, h: 45, minimized: false, zIndex: 1 },
    { id: '2', title: '记事本', icon: FileText, x: 30, y: 20, w: 35, h: 35, minimized: false, zIndex: 2 },
  ]);
  const [nextZ, setNextZ] = useState(3);

  const desktopIcons = [
    { name: '我的电脑', icon: Monitor, windowTitle: '我的电脑', windowIcon: Monitor, content: 'sysinfo' },
    { name: '回收站', icon: Trash2, windowTitle: '回收站', windowIcon: Trash2, content: 'recycle' },
    { name: '文档', icon: FileText, windowTitle: '文档', windowIcon: FolderOpen, content: 'docs' },
    { name: '网络', icon: Globe, windowTitle: '网络', windowIcon: Globe, content: 'network' },
  ];

  const taskbarApps = ['开始', 'Chrome', 'VS Code', '文件管理器', '终端'];

  const bringToFront = (id: string) => {
    setWindows((prev) => prev.map((w) => w.id === id ? { ...w, zIndex: nextZ } : w));
    setNextZ((z) => z + 1);
  };

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const minimizeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => w.id === id ? { ...w, minimized: !w.minimized } : w));
  };

  const openWindow = (title: string, icon: typeof Monitor) => {
    // Check if window with same title already exists
    const existing = windows.find((w) => w.title === title);
    if (existing) {
      if (existing.minimized) {
        setWindows((prev) => prev.map((w) => w.id === existing.id ? { ...w, minimized: false, zIndex: nextZ } : w));
      } else {
        bringToFront(existing.id);
      }
      return;
    }
    const id = Date.now().toString();
    const x = 10 + Math.random() * 30;
    const y = 5 + Math.random() * 20;
    setWindows((prev) => [...prev, { id, title, icon, x, y, w: 45, h: 45, minimized: false, zIndex: nextZ }]);
    setNextZ((z) => z + 1);
  };

  const getWindowContent = (title: string) => {
    if (title === '文件管理器') {
      return (
        <>
          <p className="text-amber-400">C:\Users\Admin</p>
          <p>桌面/</p>
          <p>文档/</p>
          <p>下载/</p>
          <p>图片/</p>
          <p>音乐/</p>
        </>
      );
    }
    if (title === '记事本') {
      return (
        <>
          <p className="text-slate-400"># 备忘录</p>
          <p>- 完成项目报告</p>
          <p>- 更新文档</p>
          <p>- 代码审查</p>
        </>
      );
    }
    if (title === '我的电脑') {
      return (
        <>
          <p className="text-cyan-400">系统信息</p>
          <p>─────────────────</p>
          <p>OS: Windows 11 Pro</p>
          <p>CPU: Intel i7-13700K</p>
          <p>RAM: 32 GB DDR5</p>
          <p>GPU: NVIDIA RTX 4070</p>
          <p>C: 128 GB / 256 GB</p>
          <p>D: 256 GB / 512 GB</p>
        </>
      );
    }
    if (title === '回收站') {
      return (
        <>
          <p className="text-slate-400">回收站 (0 个项目)</p>
          <p>─────────────────</p>
          <p className="text-slate-600">回收站为空</p>
        </>
      );
    }
    if (title === '文档') {
      return (
        <>
          <p className="text-amber-400">C:\Users\Admin\文档</p>
          <p>─────────────────</p>
          <p>项目报告.docx</p>
          <p>会议记录.txt</p>
          <p>技术方案.md</p>
          <p>设计文档.pdf</p>
        </>
      );
    }
    if (title === '网络') {
      return (
        <>
          <p className="text-cyan-400">网络状态</p>
          <p>─────────────────</p>
          <p>以太网: 已连接</p>
          <p>  IP: 192.168.1.100</p>
          <p>  速度: 1 Gbps</p>
          <p>Wi-Fi: 已连接</p>
          <p>  IP: 192.168.1.101</p>
          <p>  速度: 866 Mbps</p>
        </>
      );
    }
    return <p className="text-slate-600">窗口内容</p>;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant={isScreenSharing ? 'destructive' : 'default'}
          size="sm"
          onClick={toggleScreenSharing}
          className={`gap-2 ${!isScreenSharing ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20' : ''}`}
        >
          {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          {isScreenSharing ? '停止共享' : '开始共享'}
        </Button>
        <Select value={resolution} onValueChange={setResolution}>
          <SelectTrigger className={`w-36 h-8 text-xs ${darkInput}`}><SelectValue /></SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800 text-white">
            <SelectItem value="1920x1080">1920 x 1080</SelectItem>
            <SelectItem value="1280x720">1280 x 720</SelectItem>
            <SelectItem value="3840x2160">3840 x 2160</SelectItem>
          </SelectContent>
        </Select>
        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger className={`w-28 h-8 text-xs ${darkInput}`}><SelectValue /></SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800 text-white">
            <SelectItem value="low">低画质</SelectItem>
            <SelectItem value="medium">中画质</SelectItem>
            <SelectItem value="high">高画质</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
          <Camera className="h-4 w-4" /> 截图
        </Button>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
          <Maximize2 className="h-4 w-4" /> 全屏
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 border-slate-700 ${showShortcuts ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
          onClick={() => setShowShortcuts(!showShortcuts)}
        >
          <Keyboard className="h-4 w-4" /> 快捷键
        </Button>
      </div>

      {/* Simulated Desktop */}
      <Card className={`${darkCard} shadow-lg overflow-hidden`}>
        <div
          className="relative bg-gradient-to-br from-teal-600 via-cyan-700 to-slate-800 cursor-crosshair select-none"
          style={{ aspectRatio: '16/9' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({
              x: ((e.clientX - rect.left) / rect.width) * 100,
              y: ((e.clientY - rect.top) / rect.height) * 100,
            });
          }}
          onClick={() => setContextMenu(null)}
          onContextMenu={handleContextMenu}
        >
          {/* Desktop Icons */}
          <div className="absolute inset-0 p-4">
            <div className="grid grid-cols-1 gap-4 w-fit">
              {desktopIcons.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/20 active:bg-white/30 cursor-pointer transition-colors w-16"
                  onDoubleClick={() => {
                    if (isScreenSharing) {
                      openWindow(item.windowTitle, item.windowIcon);
                    }
                  }}
                >
                  <item.icon className="h-8 w-8 text-white drop-shadow" />
                  <span className="text-[10px] text-white text-center drop-shadow leading-tight">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Windows */}
          {isScreenSharing && windows.filter((w) => !w.minimized).map((win) => (
            <div
              key={win.id}
              className="absolute rounded-lg overflow-hidden shadow-2xl border border-white/10"
              style={{ left: `${win.x}%`, top: `${win.y}%`, width: `${win.w}%`, height: `${win.h}%`, zIndex: win.zIndex }}
              onClick={() => bringToFront(win.id)}
            >
              {/* Title bar */}
              <div className="flex items-center justify-between px-2 py-1 bg-slate-800/90 border-b border-slate-700/50">
                <div className="flex items-center gap-1.5">
                  <win.icon className="h-3 w-3 text-slate-400" />
                  <span className="text-[10px] text-slate-300 font-medium">{win.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => minimizeWindow(win.id)} className="w-4 h-4 rounded flex items-center justify-center hover:bg-slate-600/50">
                    <Minimize2 className="h-2.5 w-2.5 text-slate-400" />
                  </button>
                  <button onClick={() => closeWindow(win.id)} className="w-4 h-4 rounded flex items-center justify-center hover:bg-red-500/50">
                    <X className="h-2.5 w-2.5 text-slate-400" />
                  </button>
                </div>
              </div>
              {/* Window content */}
              <div className="bg-slate-900/90 p-2 h-[calc(100%-24px)]">
                <div className="text-[9px] text-slate-500 font-mono leading-relaxed">
                  {getWindowContent(win.title)}
                </div>
              </div>
            </div>
          ))}

          {/* Mouse Cursor */}
          <motion.div
            className="absolute pointer-events-none z-50"
            animate={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <MousePointer2 className="h-5 w-5 text-white drop-shadow-lg" />
          </motion.div>

          {/* Context Menu */}
          {contextMenu && isScreenSharing && (
            <div
              className="absolute z-40 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg py-1 shadow-xl min-w-[140px]"
              style={{ left: `${contextMenu.x}%`, top: `${contextMenu.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              {['刷新', '排列图标', '新建文件夹', '属性'].map((item) => (
                <button key={item} className="w-full text-left px-3 py-1.5 text-[10px] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors">
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Keyboard Shortcuts Overlay */}
          {showShortcuts && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-sm font-semibold text-white mb-3">快捷键</h3>
                <div className="space-y-1.5 text-[10px]">
                  {[
                    ['Ctrl+Alt+Del', '远程任务管理器'],
                    ['Ctrl+Shift+S', '屏幕截图'],
                    ['Ctrl+Shift+F', '全屏切换'],
                    ['Win+E', '文件管理器'],
                    ['Alt+F4', '关闭窗口'],
                    ['Win+D', '显示桌面'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-slate-400">{desc}</span>
                      <kbd className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-emerald-400 font-mono">{key}</kbd>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full border-slate-700 text-slate-300" onClick={() => setShowShortcuts(false)}>
                  关闭
                </Button>
              </div>
            </div>
          )}

          {/* Not Connected Overlay */}
          {!isScreenSharing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <MonitorOff className="h-12 w-12 text-slate-400" />
              </motion.div>
              <p className="text-slate-300 text-sm">点击"开始共享"查看远程桌面</p>
            </div>
          )}
        </div>

        {/* Taskbar */}
        <div className="bg-slate-950 flex items-center px-2 h-9 gap-1 border-t border-slate-800">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400">
            <AppWindow className="h-3 w-3 mr-1" /> 开始
          </Button>
          <Separator orientation="vertical" className="h-4 bg-slate-700" />
          {taskbarApps.slice(1).map((app) => (
            <Button key={app} variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              {app}
            </Button>
          ))}
          {windows.some((w) => w.minimized) && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-amber-400 hover:bg-amber-500/10" onClick={() => setWindows((prev) => prev.map((w) => ({ ...w, minimized: false })))}>
              ▸ 恢复
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-500">
            <Volume2 className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILES PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FilesPanel() {
  const { files, currentPath, setCurrentPath, fileSearch, setFileSearch } = useRemoteStore();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const pathParts = currentPath.split('\\').filter(Boolean);
  const filteredFiles = files.filter((f) =>
    !fileSearch || f.name.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const getFileIcon = (file: typeof files[0]) => {
    if (file.type === 'folder') return <Folder className="h-4 w-4 text-amber-400" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'exe') return <Settings className="h-4 w-4 text-slate-400" />;
    if (ext === 'json') return <FileText className="h-4 w-4 text-yellow-400" />;
    if (ext === 'xlsx') return <FileText className="h-4 w-4 text-emerald-400" />;
    return <File className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setCurrentPath('C:\\')} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <HardDrive className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const parent = currentPath.split('\\').slice(0, -1).join('\\');
          if (parent) setCurrentPath(parent);
        }} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-1 bg-slate-800/50 rounded-md px-2 py-1 min-w-0 overflow-x-auto border border-slate-700/50">
          {pathParts.map((part, i) => (
            <div key={i} className="flex items-center shrink-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-600 mx-0.5" />}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-slate-300 hover:text-emerald-400"
                onClick={() => setCurrentPath(pathParts.slice(0, i + 1).join('\\'))}
              >
                {part}
              </Button>
            </div>
          ))}
        </div>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="搜索文件..."
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            className={`h-8 text-xs pl-7 ${darkInput}`}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1 border-slate-700 text-slate-300 hover:bg-slate-800">
          <Upload className="h-4 w-4" /> 上传
        </Button>
        <Button variant="outline" size="sm" className="gap-1 border-slate-700 text-slate-300 hover:bg-slate-800">
          <FolderPlus className="h-4 w-4" /> 新建
        </Button>
        <div className="flex border border-slate-700 rounded-md overflow-hidden">
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0 rounded-r-none" onClick={() => setViewMode('list')}>
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0 rounded-l-none" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* File List */}
      {viewMode === 'list' ? (
        <Card className={`${darkCard} shadow-lg`}>
          <div className="grid grid-cols-[1fr_100px_140px] gap-2 px-4 py-2 text-xs text-slate-500 border-b border-slate-800 font-medium">
            <span>名称</span><span>大小</span><span>修改日期</span>
          </div>
          <ScrollArea className="max-h-96">
            {filteredFiles.map((file) => (
              <div
                key={file.name}
                className="grid grid-cols-[1fr_100px_140px] gap-2 px-4 py-2 text-xs hover:bg-slate-800/50 cursor-pointer transition-colors items-center border-b border-slate-800/50 last:border-b-0"
                onDoubleClick={() => file.type === 'folder' && setCurrentPath(file.path)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(file)}
                  <span className="truncate text-slate-300">{file.name}</span>
                </div>
                <span className="text-slate-500">{file.type === 'folder' ? '--' : formatBytes(file.size)}</span>
                <span className="text-slate-500">{file.modified}</span>
              </div>
            ))}
          </ScrollArea>
        </Card>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {filteredFiles.map((file) => (
            <div
              key={file.name}
              className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors border border-slate-800/50"
              onDoubleClick={() => file.type === 'folder' && setCurrentPath(file.path)}
            >
              {file.type === 'folder'
                ? <Folder className="h-8 w-8 text-amber-400" />
                : <File className="h-8 w-8 text-slate-500" />}
              <span className="text-[10px] text-center truncate w-full text-slate-400">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSFERS PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TransfersPanel() {
  const { fileTransfers } = useRemoteStore();
  const active = fileTransfers.filter((t) => t.status === 'transferring').length;
  const completed = fileTransfers.filter((t) => t.status === 'completed').length;
  const pending = fileTransfers.filter((t) => t.status === 'pending').length;

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-emerald-500';
    if (s === 'transferring') return 'bg-cyan-500';
    return 'bg-amber-500';
  };
  const statusLabel = (s: string) => {
    if (s === 'completed') return '已完成';
    if (s === 'transferring') return '传输中';
    return '等待中';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-cyan-400">{active}</p><p className="text-xs text-slate-400">传输中</p></CardContent></Card>
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-400">{completed}</p><p className="text-xs text-slate-400">已完成</p></CardContent></Card>
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-400">{pending}</p><p className="text-xs text-slate-400">等待中</p></CardContent></Card>
      </div>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">传输列表</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {fileTransfers.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {t.direction === 'upload' ? <ArrowUp className="h-4 w-4 text-cyan-400 shrink-0" /> : <ArrowDown className="h-4 w-4 text-emerald-400 shrink-0" />}
                      <span className="text-sm truncate text-slate-300">{t.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${statusColor(t.status)} text-white border-0`}>
                        {statusLabel(t.status)}
                      </Badge>
                    </div>
                  </div>
                  <ProgressBar value={t.progress} colorClass={statusColor(t.status)} />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>{formatBytes(t.fileSize)}</span>
                    <span>{t.progress}% - {t.speed}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLIPBOARD PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ClipboardPanel() {
  const { clipboardItems, addClipboardItem, removeClipboardItem } = useRemoteStore();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      addClipboardItem(input.trim());
      setInput('');
    }
  };

  const detectType = (text: string) => {
    if (/^https?:\/\//.test(text)) return { label: 'URL', color: 'text-cyan-400', icon: Globe };
    if (/^\d+$/.test(text)) return { label: '数字', color: 'text-teal-400', icon: Hash };
    return { label: '文本', color: 'text-emerald-400', icon: FileText };
  };

  return (
    <div className="space-y-4">
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">发送到远程剪贴板</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Textarea
            placeholder="输入要发送的内容..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className={`text-sm ${darkInput}`}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAdd} className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500">
              <Copy className="h-4 w-4" /> 发送
            </Button>
            {input && (
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                {detectType(input).label}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">剪贴板历史</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="max-h-72">
            {clipboardItems.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">暂无剪贴板内容</p>
            ) : (
              <div className="space-y-2">
                {clipboardItems.map((item, i) => {
                  const dt = detectType(item);
                  return (
                    <motion.div
                      key={`${item}-${i}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-2 rounded-lg border border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <dt.icon className={`h-4 w-4 mt-0.5 shrink-0 ${dt.color}`} />
                      <span className="flex-1 text-sm break-all text-slate-300">{item}</span>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500 hover:text-emerald-400" onClick={() => navigator.clipboard?.writeText(item)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500 hover:text-red-400" onClick={() => removeClipboardItem(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Hash icon fallback
function Hash({ className }: { className?: string }) {
  return <span className={`font-bold ${className}`}>#</span>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESSES PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ProcessesPanel() {
  const { processes, processSearch, setProcessSearch, processSortBy, setProcessSortBy } = useRemoteStore();

  const filtered = processes
    .filter((p) => !processSearch || p.name.toLowerCase().includes(processSearch.toLowerCase()))
    .sort((a, b) => {
      if (processSortBy === 'cpu') return b.cpuUsage - a.cpuUsage;
      if (processSortBy === 'memory') return b.memoryUsage - a.memoryUsage;
      return a.name.localeCompare(b.name);
    });

  const totalCpu = processes.reduce((s, p) => s + p.cpuUsage, 0);
  const totalMem = processes.reduce((s, p) => s + p.memoryUsage, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-200">{processes.length}</p><p className="text-xs text-slate-400">进程数</p></CardContent></Card>
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-400">{totalCpu.toFixed(1)}%</p><p className="text-xs text-slate-400">总 CPU</p></CardContent></Card>
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-400">{totalMem.toFixed(1)}%</p><p className="text-xs text-slate-400">总内存</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input placeholder="搜索进程..." value={processSearch} onChange={(e) => setProcessSearch(e.target.value)} className={`h-8 text-xs pl-7 ${darkInput}`} />
        </div>
        <Select value={processSortBy} onValueChange={(v) => setProcessSortBy(v as 'cpu' | 'memory' | 'name')}>
          <SelectTrigger className={`w-28 h-8 text-xs ${darkInput}`}><SelectValue /></SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800 text-white">
            <SelectItem value="cpu">CPU 排序</SelectItem>
            <SelectItem value="memory">内存排序</SelectItem>
            <SelectItem value="name">名称排序</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className={`${darkCard} shadow-lg`}>
        <ScrollArea className="max-h-96">
          <div className="grid grid-cols-[50px_1fr_80px_80px_60px_50px] gap-1 px-4 py-2 text-[10px] text-slate-500 border-b border-slate-800 font-medium">
            <span>PID</span><span>名称</span><span>CPU</span><span>内存</span><span>线程</span><span>状态</span>
          </div>
          {filtered.map((p) => (
            <div
              key={p.pid}
              className="grid grid-cols-[50px_1fr_80px_80px_60px_50px] gap-1 px-4 py-2 text-xs hover:bg-slate-800/30 transition-colors items-center border-b border-slate-800/50 last:border-b-0"
            >
              <span className="text-slate-500">{p.pid}</span>
              <span className="font-medium truncate text-slate-300">{p.name}</span>
              <div className="flex items-center gap-1">
                <div className="w-12"><ProgressBar value={p.cpuUsage} max={20} colorClass={p.cpuUsage > 10 ? 'bg-red-500' : p.cpuUsage > 5 ? 'bg-amber-500' : 'bg-emerald-500'} className="h-1.5" /></div>
                <span className="text-[10px] w-8 text-slate-400">{p.cpuUsage}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-12"><ProgressBar value={p.memoryUsage} max={30} colorClass={p.memoryUsage > 15 ? 'bg-red-500' : p.memoryUsage > 8 ? 'bg-amber-500' : 'bg-emerald-500'} className="h-1.5" /></div>
                <span className="text-[10px] w-8 text-slate-400">{p.memoryUsage}%</span>
              </div>
              <span className="text-slate-500 text-[10px]">{p.threads}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{p.status}</Badge>
            </div>
          ))}
        </ScrollArea>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SystemPanel() {
  const { systemInfo } = useRemoteStore();
  if (!systemInfo) return <p className="text-slate-400 text-sm">加载中...</p>;
  const si = systemInfo;
  const memPct = Math.round((si.memory.used / si.memory.total) * 100);

  return (
    <div className="space-y-4">
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">操作系统</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-slate-500">系统</span><p className="font-medium text-slate-200">{si.os}</p></div>
            <div><span className="text-slate-500">版本</span><p className="font-medium text-slate-200">{si.osVersion}</p></div>
            <div><span className="text-slate-500">主机名</span><p className="font-medium text-slate-200">{si.hostname}</p></div>
            <div><span className="text-slate-500">运行时间</span><p className="font-medium text-slate-200">{formatDuration(si.uptime * 1000)}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-300">CPU - {si.cpu.model}</CardTitle>
            <div className="flex items-center gap-1.5">
              <Thermometer className={`h-3.5 w-3.5 ${si.cpu.temperature > 80 ? 'text-red-400' : si.cpu.temperature > 60 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className="text-xs text-slate-300">{si.cpu.temperature}°C</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500 w-8">总</span>
            <ProgressBar value={si.cpu.usage} colorClass={si.cpu.usage > 80 ? 'bg-red-500' : si.cpu.usage > 50 ? 'bg-amber-500' : 'bg-emerald-500'} />
            <span className="text-xs w-8 text-slate-300">{si.cpu.usage}%</span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {si.cpu.perCore.map((usage, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="w-full h-10 bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
                  <motion.div
                    className={`w-full ${usage > 80 ? 'bg-red-500' : usage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${usage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-[8px] text-slate-500">{i}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">内存</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-2">
            <ProgressBar value={memPct} colorClass={memPct > 80 ? 'bg-red-500' : memPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'} />
            <span className="text-xs w-12 text-slate-300">{memPct}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div><p className="text-slate-500">总计</p><p className="font-medium text-slate-200">{formatBytes(si.memory.total)}</p></div>
            <div><p className="text-slate-500">已用</p><p className="font-medium text-slate-200">{formatBytes(si.memory.used)}</p></div>
            <div><p className="text-slate-500">可用</p><p className="font-medium text-slate-200">{formatBytes(si.memory.available)}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">磁盘</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          {si.disks.map((d) => {
            const pct = Math.round((d.used / d.total) * 100);
            return (
              <div key={d.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-300">{d.name}</span>
                  <span className="text-slate-500">{formatBytes(d.used)} / {formatBytes(d.total)}</span>
                </div>
                <ProgressBar value={pct} colorClass={pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-cyan-500'} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">网络</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {si.network.map((n) => (
              <div key={n.interface} className="p-3 rounded-xl border border-slate-700/50 text-xs bg-slate-800/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-300">{n.interface}</span>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{n.speed}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-slate-500">
                  <span>IP: {n.ip}</span>
                  <span>发送: {formatBytes(n.sent)}</span>
                  <span>接收: {formatBytes(n.received)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDIO PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AudioPanel() {
  const { audioVolume, setAudioVolume, isAudioStreaming, toggleAudioStreaming } = useRemoteStore();
  const [codec, setCodec] = useState('opus');
  const [visualizerBars] = useState(() => Array.from({ length: 16 }, () => Math.random()));
  const [eqValues, setEqValues] = useState([60, 70, 80, 75, 65, 55]);

  const eqLabels = ['60Hz', '250Hz', '1kHz', '4kHz', '8kHz', '16kHz'];

  return (
    <div className="space-y-4">
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">音量控制</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-3">
            {isAudioStreaming ? <Speaker className="h-5 w-5 text-emerald-400" /> : <VolumeX className="h-5 w-5 text-slate-500" />}
            <Slider value={[audioVolume]} onValueChange={(v) => setAudioVolume(v[0])} max={100} step={1} className="flex-1" />
            <span className="text-sm font-medium w-10 text-right text-slate-300">{audioVolume}%</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isAudioStreaming ? 'destructive' : 'default'}
              size="sm"
              onClick={toggleAudioStreaming}
              className={`gap-2 ${!isAudioStreaming ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500' : ''}`}
            >
              {isAudioStreaming ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isAudioStreaming ? '停止音频' : '开始音频'}
            </Button>
            <Select value={codec} onValueChange={setCodec}>
              <SelectTrigger className={`w-32 h-8 text-xs ${darkInput}`}><SelectValue /></SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-white">
                <SelectItem value="opus">Opus</SelectItem>
                <SelectItem value="aac">AAC</SelectItem>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="pcm">PCM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">均衡器</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-6 gap-3">
            {eqValues.map((val, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Slider
                  value={[val]}
                  onValueChange={(v) => {
                    const newVals = [...eqValues];
                    newVals[i] = v[0];
                    setEqValues(newVals);
                  }}
                  max={100}
                  step={1}
                  orientation="vertical"
                  className="h-24"
                />
                <span className="text-[9px] text-slate-500">{eqLabels[i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">音频可视化</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="h-24 flex items-end justify-center gap-1">
            {visualizerBars.map((base, i) => (
              <motion.div
                key={i}
                className="w-3 bg-emerald-500/60 rounded-t"
                animate={{
                  height: isAudioStreaming ? `${10 + base * 80}%` : '4px',
                }}
                transition={{
                  duration: 0.3,
                  repeat: isAudioStreaming ? Infinity : 0,
                  repeatType: 'reverse',
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
          {!isAudioStreaming && (
            <p className="text-center text-xs text-slate-500 mt-2">开始音频传输以查看可视化</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TERMINAL PANEL - Functional with simulated commands
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface TermLine {
  type: 'input' | 'output' | 'error' | 'system' | 'success' | 'warning';
  content: string;
}

function TerminalPanel() {
  const { addTerminalCommand } = useRemoteStore();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lines, setLines] = useState<TermLine[]>([
    { type: 'system', content: 'Microsoft Windows [Version 10.0.22631]' },
    { type: 'system', content: '(c) Microsoft Corporation. All rights reserved.' },
    { type: 'system', content: '' },
    { type: 'success', content: '远程终端已连接。输入 "help" 查看可用命令。' },
    { type: 'system', content: '' },
  ]);
  const [tabHint, setTabHint] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allCommands = ['dir', 'ls', 'cd', 'ipconfig', 'systeminfo', 'tasklist', 'ping', 'netstat', 'cls', 'clear', 'help', 'whoami', 'hostname', 'date', 'time', 'echo', 'ver', 'shutdown', 'restart', 'top', 'cat'];

  const simulateCommand = (cmd: string): TermLine[] => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const outputs: TermLine[] = [{ type: 'input', content: `PS C:\\Users\\Admin> ${cmd}` }];

    switch (command) {
      case 'dir':
      case 'ls':
        outputs.push(
          { type: 'output', content: '' },
          { type: 'output', content: ' 驱动器 C 中的卷是 Windows' },
          { type: 'output', content: ' 卷的序列号是 1234-5678' },
          { type: 'output', content: '' },
          { type: 'output', content: ' C:\\Users\\Admin 的目录' },
          { type: 'output', content: '' },
          { type: 'output', content: '2024/12/15  10:30    <DIR>          桌面' },
          { type: 'output', content: '2024/12/14  16:20    <DIR>          文档' },
          { type: 'output', content: '2024/12/15  08:45    <DIR>          下载' },
          { type: 'output', content: '2024/12/13  14:10    <DIR>          图片' },
          { type: 'output', content: '2024/12/15  09:15           2,048  readme.txt' },
          { type: 'output', content: '2024/12/14  17:00             512  config.json' },
          { type: 'output', content: '' },
          { type: 'success', content: '               2 个文件        2,560 字节' },
          { type: 'output', content: '               4 个目录  128,000,000,000 可用字节' },
        );
        break;
      case 'cd':
        if (args[0]) {
          outputs.push({ type: 'success', content: `目录已更改为 ${args[0]}` });
        } else {
          outputs.push({ type: 'output', content: 'C:\\Users\\Admin' });
        }
        break;
      case 'ipconfig':
        outputs.push(
          { type: 'output', content: '' },
          { type: 'output', content: 'Windows IP 配置' },
          { type: 'output', content: '' },
          { type: 'output', content: '以太网适配器 以太网:' },
          { type: 'output', content: '   连接特定的 DNS 后缀 . . . :' },
          { type: 'success', content: '   IPv4 地址 . . . . . . . . . : 192.168.1.100' },
          { type: 'output', content: '   子网掩码 . . . . . . . . . : 255.255.255.0' },
          { type: 'output', content: '   默认网关 . . . . . . . . . : 192.168.1.1' },
        );
        break;
      case 'systeminfo':
        outputs.push(
          { type: 'output', content: '' },
          { type: 'output', content: '主机名:           DESKTOP-REMOTE01' },
          { type: 'output', content: 'OS 名称:          Microsoft Windows 11 Pro' },
          { type: 'output', content: 'OS 版本:          10.0.22631 Build 22631' },
          { type: 'output', content: '系统制造商:       ASUS' },
          { type: 'output', content: '处理器:           Intel(R) Core(TM) i7-13700K' },
          { type: 'output', content: '物理内存总量:     32,768 MB' },
          { type: 'warning', content: '可用的物理内存:   15,580 MB (52% 已使用)' },
          { type: 'output', content: '虚拟内存: 最大值: 38,912 MB' },
        );
        break;
      case 'tasklist':
        outputs.push(
          { type: 'output', content: '' },
          { type: 'output', content: '映像名称                       PID 会话名              内存使用' },
          { type: 'output', content: '========================= ======== ================ ============' },
          { type: 'output', content: 'System Idle Process              0 Services                 8 K' },
          { type: 'output', content: 'System                           4 Services               152 K' },
          { type: 'output', content: 'explorer.exe                  1024 Console            8,400 K' },
          { type: 'warning', content: 'chrome.exe                    2048 Console          220,000 K' },
          { type: 'warning', content: 'code.exe                     3012 Console          156,000 K' },
          { type: 'output', content: 'node.exe                     4096 Console           63,000 K' },
          { type: 'success', content: 'notepad.exe                  5120 Console              800 K' },
        );
        break;
      case 'ping':
        if (args[0]) {
          const host = args[0];
          const t1 = Math.floor(Math.random() * 20 + 1);
          const t2 = Math.floor(Math.random() * 20 + 1);
          const t3 = Math.floor(Math.random() * 20 + 1);
          const t4 = Math.floor(Math.random() * 20 + 1);
          outputs.push(
            { type: 'output', content: '' },
            { type: 'output', content: `正在 Ping ${host} 具有 32 字节的数据:` },
            { type: 'success', content: `来自 ${host} 的回复: 字节=32 时间=${t1}ms TTL=64` },
            { type: 'success', content: `来自 ${host} 的回复: 字节=32 时间=${t2}ms TTL=64` },
            { type: 'success', content: `来自 ${host} 的回复: 字节=32 时间=${t3}ms TTL=64` },
            { type: 'success', content: `来自 ${host} 的回复: 字节=32 时间=${t4}ms TTL=64` },
            { type: 'output', content: '' },
            { type: 'output', content: `${host} 的 Ping 统计信息:` },
            { type: 'success', content: '    数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)' },
            { type: 'output', content: `往返行程的估计时间(毫秒): 最短 = ${Math.min(t1,t2,t3,t4)}ms，最长 = ${Math.max(t1,t2,t3,t4)}ms，平均 = ${Math.round((t1+t2+t3+t4)/4)}ms` },
          );
        } else {
          outputs.push({ type: 'error', content: '用法: ping <主机名或IP地址>' });
        }
        break;
      case 'netstat':
        outputs.push(
          { type: 'output', content: '' },
          { type: 'output', content: '活动连接' },
          { type: 'output', content: '' },
          { type: 'output', content: '  协议    本地地址            外部地址            状态' },
          { type: 'success', content: '  TCP    0.0.0.0:9527        0.0.0.0:0           LISTENING' },
          { type: 'success', content: '  TCP    192.168.1.100:9527  192.168.1.50:54321  ESTABLISHED' },
          { type: 'warning', content: '  TCP    192.168.1.100:80    192.168.1.1:443      TIME_WAIT' },
          { type: 'output', content: '  TCP    192.168.1.100:443   104.26.10.78:443     ESTABLISHED' },
          { type: 'output', content: '  UDP    0.0.0.0:5353        *:*                  ' },
        );
        break;
      case 'cls':
      case 'clear':
        setLines([]);
        return [];
      case 'help':
        outputs.push(
          { type: 'output', content: '' },
          { type: 'success', content: '╔══════════════════════════════════════════╗' },
          { type: 'success', content: '║           可用命令列表                    ║' },
          { type: 'success', content: '╚══════════════════════════════════════════╝' },
          { type: 'output', content: '' },
          { type: 'output', content: '  📁 文件操作:' },
          { type: 'output', content: '    dir / ls        - 列出目录内容' },
          { type: 'output', content: '    cd <路径>       - 更改目录' },
          { type: 'output', content: '    cat <文件>      - 查看文件内容' },
          { type: 'output', content: '' },
          { type: 'output', content: '  🌐 网络诊断:' },
          { type: 'output', content: '    ipconfig        - 显示网络配置' },
          { type: 'output', content: '    ping <主机>     - 网络连通测试' },
          { type: 'output', content: '    netstat         - 显示网络连接' },
          { type: 'output', content: '' },
          { type: 'output', content: '  💻 系统信息:' },
          { type: 'output', content: '    systeminfo      - 显示系统信息' },
          { type: 'output', content: '    tasklist / top  - 显示进程列表' },
          { type: 'output', content: '    hostname        - 显示主机名' },
          { type: 'output', content: '    whoami          - 显示当前用户' },
          { type: 'output', content: '    ver             - 显示版本信息' },
          { type: 'output', content: '' },
          { type: 'output', content: '  🕐 时间日期:' },
          { type: 'output', content: '    date            - 显示日期' },
          { type: 'output', content: '    time            - 显示时间' },
          { type: 'output', content: '' },
          { type: 'output', content: '  🔧 其他:' },
          { type: 'output', content: '    echo <文本>     - 显示文本' },
          { type: 'output', content: '    cls / clear     - 清空屏幕' },
          { type: 'output', content: '    shutdown        - 模拟关机' },
          { type: 'output', content: '    restart         - 模拟重启' },
          { type: 'output', content: '    help            - 显示帮助' },
          { type: 'output', content: '' },
          { type: 'warning', content: '  💡 提示: 按 Tab 键自动补全命令，↑↓ 键浏览历史' },
        );
        break;
      case 'echo':
        outputs.push({ type: 'output', content: args.join(' ') });
        break;
      case 'hostname':
        outputs.push({ type: 'success', content: 'DESKTOP-REMOTE01' });
        break;
      case 'whoami':
        outputs.push({ type: 'success', content: 'desktop-remote01\\admin' });
        break;
      case 'date':
        outputs.push({ type: 'success', content: `当前日期: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}` });
        break;
      case 'time':
        outputs.push({ type: 'success', content: `当前时间: ${new Date().toLocaleTimeString('zh-CN')}` });
        break;
      case 'ver':
        outputs.push({ type: 'output', content: '' });
        outputs.push({ type: 'success', content: 'Microsoft Windows [版本 10.0.22631.2506]' });
        break;
      case 'shutdown':
        outputs.push(
          { type: 'warning', content: '' },
          { type: 'warning', content: '⚠ 警告: 即将关闭远程计算机...' },
          { type: 'error', content: '（模拟模式，不会真正关机）' },
        );
        break;
      case 'restart':
        outputs.push(
          { type: 'warning', content: '' },
          { type: 'warning', content: '⚠ 警告: 即将重启远程计算机...' },
          { type: 'error', content: '（模拟模式，不会真正重启）' },
        );
        break;
      case 'top':
        outputs.push(
          { type: 'output', content: '' },
          { type: 'output', content: '  PID  CPU%  MEM%  名称' },
          { type: 'output', content: '─────────────────────────────────────' },
          { type: 'warning', content: ' 2048  15.3  22.1  chrome.exe' },
          { type: 'warning', content: ' 3012   8.7  15.6  code.exe' },
          { type: 'output', content: ' 4096   5.2   6.3  node.exe' },
          { type: 'output', content: ' 1024   2.5   8.4  explorer.exe' },
          { type: 'success', content: ' 5120   0.1   0.8  notepad.exe' },
          { type: 'output', content: '' },
          { type: 'output', content: ' CPU 总使用: 23%  |  内存: 17.5 GB / 32 GB' },
        );
        break;
      case 'cat':
        if (args[0]) {
          if (args[0].includes('readme')) {
            outputs.push(
              { type: 'output', content: `=== ${args[0]} ===` },
              { type: 'output', content: '# 远程控制系统' },
              { type: 'output', content: '' },
              { type: 'output', content: '欢迎使用远程控制系统 v2.1.0' },
              { type: 'output', content: '本系统支持远程桌面、文件管理、终端命令等功能。' },
            );
          } else if (args[0].includes('config')) {
            outputs.push(
              { type: 'output', content: `=== ${args[0]} ===` },
              { type: 'output', content: '{' },
              { type: 'success', content: '  "port": 9527,' },
              { type: 'success', content: '  "host": "0.0.0.0",' },
              { type: 'warning', content: '  "password": "********",' },
              { type: 'output', content: '  "encryption": "TLS 1.3"' },
              { type: 'output', content: '}' },
            );
          } else {
            outputs.push({ type: 'error', content: `无法读取文件 '${args[0]}': 文件不存在或无权限` });
          }
        } else {
          outputs.push({ type: 'error', content: '用法: cat <文件名>' });
        }
        break;
      default:
        outputs.push({ type: 'error', content: `'${command}' 不是内部或外部命令，也不是可运行的程序。输入 'help' 查看可用命令。` });
    }
    return outputs;
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    const cmd = input.trim();
    addTerminalCommand(cmd);
    const newLines = simulateCommand(cmd);
    setLines((prev) => [...prev, ...newLines]);
    setHistory((prev) => [cmd, ...prev]);
    setInput('');
    setHistoryIndex(-1);
    setTabHint(null);
  };

  const handleTabComplete = () => {
    const partial = input.trim().toLowerCase();
    if (!partial) return;
    const matches = allCommands.filter((c) => c.startsWith(partial));
    if (matches.length === 1) {
      setInput(matches[0] + ' ');
      setTabHint(null);
    } else if (matches.length > 1) {
      setTabHint(matches.join('  '));
    } else {
      setTabHint(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      if (newIndex !== historyIndex && history[newIndex]) {
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else {
      setTabHint(null);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, tabHint]);

  const suggestions = ['dir', 'cd', 'ipconfig', 'systeminfo', 'tasklist', 'ping', 'netstat', 'cls', 'help', 'whoami', 'hostname', 'date', 'ver', 'top', 'cat'];

  const lineColor = (type: TermLine['type']) => {
    switch (type) {
      case 'input': return 'text-cyan-400';
      case 'error': return 'text-red-400';
      case 'system': return 'text-slate-500';
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`${darkCard} shadow-lg overflow-hidden`}>
        <div className="bg-slate-950 font-mono text-xs">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <Terminal className="h-3.5 w-3.5 text-slate-500 ml-2" />
            <span className="text-slate-400 text-xs ml-1">Windows PowerShell</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400">已连接</span>
              </div>
            </div>
          </div>
          {/* Terminal Output */}
          <div
            ref={scrollRef}
            className="p-3 h-80 overflow-y-auto cursor-text"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
            onClick={() => inputRef.current?.focus()}
          >
            {lines.map((line, i) => (
              <p key={i} className={`${lineColor(line.type)} leading-5 whitespace-pre-wrap`}>
                {line.content || '\u00A0'}
              </p>
            ))}
            {/* Tab hint */}
            {tabHint && (
              <p className="text-teal-400/70 leading-5">
                可选: {tabHint}
              </p>
            )}
          </div>
          {/* Input */}
          <div className="flex items-center px-3 py-2 border-t border-slate-800 bg-slate-950/50">
            <span className="text-cyan-400 mr-1 shrink-0">PS C:\Users\Admin&gt;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setTabHint(null); }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-emerald-400 caret-emerald-400 min-w-0"
              placeholder="输入命令... (Tab 补全, ↑↓ 历史)"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      </Card>

      {/* Command Suggestions */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-300">常用命令</CardTitle>
            <span className="text-[10px] text-slate-600">点击快速输入</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((cmd) => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                className="text-xs font-mono border-slate-700 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                onClick={() => { setInput(cmd + ' '); inputRef.current?.focus(); setTabHint(null); }}
              >
                {cmd}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGS PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LogsPanel() {
  const { operationLogs, logCategoryFilter, setLogCategoryFilter } = useRemoteStore();
  const [search, setSearch] = useState('');

  const categories = ['all', '连接', '文件', '系统', '屏幕', '音频'];

  const filtered = operationLogs.filter((log) => {
    const matchCategory = logCategoryFilter === 'all' || log.category === logCategoryFilter;
    const matchSearch = !search || log.detail.toLowerCase().includes(search.toLowerCase()) || log.action.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const infoCount = operationLogs.filter((l) => l.severity === 'info').length;
  const warnCount = operationLogs.filter((l) => l.severity === 'warning').length;
  const errCount = operationLogs.filter((l) => l.severity === 'error').length;

  const severityIcon = (s: string) => {
    if (s === 'info') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    return <AlertCircle className="h-4 w-4 text-red-400" />;
  };

  const severityBg = (s: string) => {
    if (s === 'info') return 'bg-emerald-500/5';
    if (s === 'warning') return 'bg-amber-500/5';
    return 'bg-red-500/5';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><div><p className="text-lg font-bold text-slate-200">{infoCount}</p><p className="text-[10px] text-slate-400">信息</p></div></CardContent></Card>
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /><div><p className="text-lg font-bold text-slate-200">{warnCount}</p><p className="text-[10px] text-slate-400">警告</p></div></CardContent></Card>
        <Card className={`${darkCard} shadow-lg`}><CardContent className="p-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-400" /><div><p className="text-lg font-bold text-slate-200">{errCount}</p><p className="text-[10px] text-slate-400">错误</p></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input placeholder="搜索日志..." value={search} onChange={(e) => setSearch(e.target.value)} className={`h-8 text-xs pl-7 ${darkInput}`} />
        </div>
        <Select value={logCategoryFilter} onValueChange={setLogCategoryFilter}>
          <SelectTrigger className={`w-28 h-8 text-xs ${darkInput}`}><SelectValue /></SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800 text-white">
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c === 'all' ? '全部' : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className={`${darkCard} shadow-lg`}>
        <ScrollArea className="max-h-96">
          <div className="divide-y divide-slate-800/50">
            {filtered.map((log) => (
              <div key={log.id} className={`flex items-start gap-3 p-3 hover:bg-slate-800/30 transition-colors ${severityBg(log.severity)}`}>
                <div className="mt-0.5 shrink-0">{severityIcon(log.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px] h-4 border-slate-700 text-slate-400">{log.category}</Badge>
                    <span className="text-xs font-medium text-slate-300">{log.action}</span>
                  </div>
                  <p className="text-xs text-slate-400">{log.detail}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOWNLOAD PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DownloadPanel() {
  const downloads = [
    {
      name: 'RC-Server-GUI v2.1.0',
      desc: '远程控制服务端 - 安装在需要被远程控制的电脑上（含图形界面）',
      version: 'v2.1.0',
      size: '103 MB',
      platform: 'Windows x64',
      icon: Monitor,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      hash: 'RC-Server-GUI-v2.1.0.zip',
      changelog: '改进认证流程，添加密码重试对话框，密码保护状态显示',
      downloadUrl: '/downloads/RC-Server-GUI-v2.1.0.zip',
      exeName: 'RC-Server.exe',
    },
    {
      name: 'RC-Client-GUI v2.1.0',
      desc: '远程控制客户端 - 安装在用于远程控制的电脑上（含图形界面）',
      version: 'v2.1.0',
      size: '103 MB',
      platform: 'Windows x64',
      icon: Command,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      hash: 'RC-Client-GUI-v2.1.0.zip',
      changelog: '改进认证流程，添加密码重试对话框，无需认证时跳过验证步骤',
      downloadUrl: '/downloads/RC-Client-GUI-v2.1.0.zip',
      exeName: 'RC-Client.exe',
    },
    {
      name: 'rc-server-linux',
      desc: 'Linux 服务端 - 适用于 Ubuntu/Debian/CentOS',
      version: 'v2.1.0',
      size: '9.8 MB',
      platform: 'Linux',
      icon: Server,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      hash: '命令行版本',
      changelog: '支持 systemd 服务，新增系统监控功能',
      downloadUrl: '',
      exeName: 'rc-server',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">下载中心</h2>
        <p className="text-sm text-slate-400 mt-1">下载远程控制组件，开始远程管理您的设备</p>
      </div>

      {/* Version Banner */}
      <Card className={`${darkCard} shadow-lg border-emerald-500/20`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">最新版本 v2.1.0</p>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-400">NEW</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">发布日期: 2025-04-25 | 改进认证流程，添加密码重试对话框，增强用户体验</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {downloads.map((dl) => (
          <Card key={dl.name} className={`${darkCard} shadow-lg transition-all hover:border-slate-700 hover:shadow-emerald-500/5`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-start gap-3">
                <div className={`p-3 rounded-xl ${dl.bg}`}>
                  <dl.icon className={`h-8 w-8 ${dl.color}`} />
                </div>
                <div className="w-full min-w-0">
                  <h3 className="font-semibold text-white">{dl.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{dl.desc}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{dl.version}</Badge>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{dl.size}</Badge>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{dl.platform}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">{dl.hash}</p>
                  <p className="text-[10px] text-slate-500 mt-1">📝 {dl.changelog}</p>
                  {dl.downloadUrl ? (
                    <a href={dl.downloadUrl} download>
                      <Button className="mt-4 w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20" size="sm">
                        <Download className="h-4 w-4" /> 下载 {dl.exeName}
                      </Button>
                    </a>
                  ) : (
                    <Button className="mt-4 w-full gap-2 bg-slate-700 text-slate-400 cursor-not-allowed" size="sm" disabled>
                      <Download className="h-4 w-4" /> 即将推出
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Info className="h-4 w-4 text-teal-400" /> 安装说明</CardTitle></CardHeader>
        <CardContent className="pt-0 text-xs text-slate-400 space-y-2">
          <p>1. 下载 ZIP 文件并解压到任意目录</p>
          <p>2. 在被控端电脑上运行 <code className="bg-slate-800 border border-slate-700 px-1 py-0.5 rounded text-emerald-400">RC-Server.exe</code>，点击"启动服务"按钮启动（默认端口 9527）</p>
          <p>3. 确保防火墙允许 9527 端口的入站连接</p>
          <p>4. 在控制端运行 <code className="bg-slate-800 border border-slate-700 px-1 py-0.5 rounded text-cyan-400">RC-Client.exe</code>，输入服务端 IP 地址连接</p>
          <p>5. 连接成功后即可使用终端、文件管理、进程管理等功能</p>
          <Separator className="bg-slate-800 my-3" />
          <p className="text-slate-500">提示：标题栏和状态栏显示当前软件版本号，请确保使用最新版本</p>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">版本历史</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[
              { ver: 'v2.1.0', date: '2025-04-25', changes: ['改进认证流程UX，添加密码重试对话框', '认证失败时显示密码输入框和重试按钮', '无需认证时跳过验证步骤显示', '服务端设置页面添加密码保护状态提示', '仪表盘显示密码保护状态', '服务端密码字段动态提示'], current: true },
              { ver: 'v1.0.0', date: '2025-04-24', changes: ['初始发布', '图形界面服务端/客户端', 'WebSocket远程控制', '终端/文件/进程管理'], current: false },
            ].map((release) => (
              <div key={release.ver} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${release.current ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div className="w-0.5 flex-1 bg-slate-800" />
                </div>
                <div className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{release.ver}</span>
                    <span className="text-[10px] text-slate-500">{release.date}</span>
                    {release.current && <Badge variant="outline" className="text-[9px] border-emerald-500/30 bg-emerald-500/10 text-emerald-400">当前</Badge>}
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {release.changes.map((c) => (
                      <li key={c} className="text-xs text-slate-400">• {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SettingsPanel() {
  const { audioVolume, setAudioVolume } = useRemoteStore();
  const [settings, setSettings] = useState({
    autoConnect: true,
    showNotifications: true,
    soundNotifications: false,
    highQualityScreen: true,
    lowLatencyMode: false,
    encryptTransfer: true,
    confirmDisconnect: true,
    showPassword: false,
  });
  const [connectionQuality, setConnectionQuality] = useState('high');
  const [resolution, setResolution] = useState('1920x1080');
  const [scaling, setScaling] = useState('100');
  const [encryption, setEncryption] = useState('tls13');
  const [password, setPassword] = useState('my-secret-password');

  const toggle = (key: keyof typeof settings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="space-y-4">
      {/* Connection Settings */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Wifi className="h-4 w-4 text-emerald-400" /> 连接设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">自动连接</p><p className="text-[10px] text-slate-500">启动时自动连接上次设备</p></div>
            <Switch checked={settings.autoConnect} onCheckedChange={() => toggle('autoConnect')} />
          </div>
          <Separator className="bg-slate-800" />
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">断开确认</p><p className="text-[10px] text-slate-500">断开连接前弹出确认</p></div>
            <Switch checked={settings.confirmDisconnect} onCheckedChange={() => toggle('confirmDisconnect')} />
          </div>
          <Separator className="bg-slate-800" />
          <div>
            <Label className="text-sm text-slate-300">连接质量</Label>
            <Select value={connectionQuality} onValueChange={setConnectionQuality}>
              <SelectTrigger className={`w-full h-8 text-xs mt-1 ${darkInput}`}><SelectValue /></SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-white">
                <SelectItem value="low">低（节省带宽）</SelectItem>
                <SelectItem value="medium">中（平衡）</SelectItem>
                <SelectItem value="high">高（最佳体验）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Monitor className="h-4 w-4 text-cyan-400" /> 显示设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">高清画质</p><p className="text-[10px] text-slate-500">优先画质而非帧率</p></div>
            <Switch checked={settings.highQualityScreen} onCheckedChange={() => toggle('highQualityScreen')} />
          </div>
          <Separator className="bg-slate-800" />
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">低延迟模式</p><p className="text-[10px] text-slate-500">优先响应速度</p></div>
            <Switch checked={settings.lowLatencyMode} onCheckedChange={() => toggle('lowLatencyMode')} />
          </div>
          <Separator className="bg-slate-800" />
          <div>
            <Label className="text-sm text-slate-300">分辨率</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger className={`w-full h-8 text-xs mt-1 ${darkInput}`}><SelectValue /></SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-white">
                <SelectItem value="1280x720">1280 x 720 (HD)</SelectItem>
                <SelectItem value="1920x1080">1920 x 1080 (FHD)</SelectItem>
                <SelectItem value="2560x1440">2560 x 1440 (QHD)</SelectItem>
                <SelectItem value="3840x2160">3840 x 2160 (4K)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-slate-300">缩放比例</Label>
            <Select value={scaling} onValueChange={setScaling}>
              <SelectTrigger className={`w-full h-8 text-xs mt-1 ${darkInput}`}><SelectValue /></SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-white">
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
                <SelectItem value="125">125%</SelectItem>
                <SelectItem value="150">150%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Shield className="h-4 w-4 text-teal-400" /> 安全设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">加密传输</p><p className="text-[10px] text-slate-500">使用加密协议保护数据传输</p></div>
            <Switch checked={settings.encryptTransfer} onCheckedChange={() => toggle('encryptTransfer')} />
          </div>
          <Separator className="bg-slate-800" />
          <div>
            <Label className="text-sm text-slate-300">加密协议</Label>
            <Select value={encryption} onValueChange={setEncryption}>
              <SelectTrigger className={`w-full h-8 text-xs mt-1 ${darkInput}`}><SelectValue /></SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-white">
                <SelectItem value="tls13">TLS 1.3 (推荐)</SelectItem>
                <SelectItem value="tls12">TLS 1.2</SelectItem>
                <SelectItem value="aes256">AES-256</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-slate-300">连接密码</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  type={settings.showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={darkInput}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-slate-500 hover:text-slate-300"
                  onClick={() => toggle('showPassword')}
                >
                  {settings.showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Volume2 className="h-4 w-4 text-orange-400" /> 音频设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <Label className="text-sm text-slate-300">默认音量</Label>
            <div className="flex items-center gap-3 mt-1">
              <Slider value={[audioVolume]} onValueChange={(v) => setAudioVolume(v[0])} max={100} step={1} className="flex-1" />
              <span className="text-sm w-10 text-right text-slate-300">{audioVolume}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Bell className="h-4 w-4 text-amber-400" /> 通知设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">桌面通知</p><p className="text-[10px] text-slate-500">接收系统桌面通知</p></div>
            <Switch checked={settings.showNotifications} onCheckedChange={() => toggle('showNotifications')} />
          </div>
          <Separator className="bg-slate-800" />
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-300">声音提醒</p><p className="text-[10px] text-slate-500">事件触发时播放提示音</p></div>
            <Switch checked={settings.soundNotifications} onCheckedChange={() => toggle('soundNotifications')} />
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Keyboard className="h-4 w-4 text-slate-400" /> 快捷键</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Ctrl+1~9, 0, -, =', '切换标签页'],
              ['Ctrl+B', '折叠/展开侧栏'],
              ['Ctrl+Shift+S', '屏幕截图'],
              ['Ctrl+Shift+T', '打开终端'],
              ['Ctrl+Shift+F', '文件管理'],
              ['Esc', '退出全屏'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-slate-400">{desc}</span>
                <kbd className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">{key}</kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className={`${darkCard} shadow-lg`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Info className="h-4 w-4 text-slate-400" /> 关于</CardTitle></CardHeader>
        <CardContent className="pt-0 text-xs text-slate-400 space-y-1">
          <p>远程控制系统 v2.1.0</p>
          <p>基于 WebRTC 和 WebSocket 技术构建</p>
          <div className="flex items-center gap-1 mt-2">
            <Github className="h-3.5 w-3.5" />
            <span>GitHub Repository</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN LAYOUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MainLayout() {
  const {
    activeTab, setActiveTab, connectedDevice, disconnect,
    latency, connectStartTime, isScreenSharing, isAudioStreaming,
    sidebarCollapsed, toggleSidebar, systemInfo,
  } = useRemoteStore();

  const [elapsed, setElapsed] = useState('00:00:00');
  const [now, setNow] = useState(Date.now());
  const [dataTransferred, setDataTransferred] = useState({ up: 12500, down: 45200 });

  // Timer for connection duration & simulated data
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (connectStartTime) {
        setElapsed(formatDuration(Date.now() - connectStartTime));
      }
      setDataTransferred((prev) => ({
        up: prev.up + Math.floor(Math.random() * 500),
        down: prev.down + Math.floor(Math.random() * 2000),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [connectStartTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === 'b') { e.preventDefault(); toggleSidebar(); return; }
        const tabId = shortcutKeyMap[e.key];
        if (tabId) { e.preventDefault(); setActiveTab(tabId); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar, setActiveTab]);

  const cpuUsage = systemInfo?.cpu.usage ?? 0;
  const memPct = systemInfo ? Math.round((systemInfo.memory.used / systemInfo.memory.total) * 100) : 0;

  const connectionQuality = latency < 20 ? 'excellent' : latency < 40 ? 'good' : 'poor';
  const qualityLabel = connectionQuality === 'excellent' ? '优秀' : connectionQuality === 'good' ? '良好' : '较差';
  const qualityColor = connectionQuality === 'excellent' ? 'text-emerald-400' : connectionQuality === 'good' ? 'text-amber-400' : 'text-red-400';
  const qualityDot = connectionQuality === 'excellent' ? 'bg-emerald-400' : connectionQuality === 'good' ? 'bg-amber-400' : 'bg-red-400';

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPanel />;
      case 'screen': return <ScreenPanel />;
      case 'files': return <FilesPanel />;
      case 'transfers': return <TransfersPanel />;
      case 'clipboard': return <ClipboardPanel />;
      case 'processes': return <ProcessesPanel />;
      case 'system': return <SystemPanel />;
      case 'audio': return <AudioPanel />;
      case 'terminal': return <TerminalPanel />;
      case 'logs': return <LogsPanel />;
      case 'download': return <DownloadPanel />;
      case 'settings': return <SettingsPanel />;
      default: return <DashboardPanel />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          className="flex flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0 overflow-hidden"
          animate={{ width: sidebarCollapsed ? 56 : 220 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {/* Logo */}
          <div className="h-12 flex items-center gap-2 px-3 border-b border-slate-800 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-semibold text-sm whitespace-nowrap bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
              >
                RemoteCtrl
              </motion.span>
            )}
          </div>

          {/* Tabs */}
          <ScrollArea className="flex-1 py-1">
            <div className="space-y-0.5 px-1.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border border-emerald-500/20'
                        : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{tab.label}</span>
                        <span className={`text-[9px] font-mono ${isActive ? 'text-emerald-400/60' : 'text-slate-600'}`}>
                          {tab.shortcut.replace('Ctrl+', '')}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Indicators */}
          {!sidebarCollapsed && (isScreenSharing || isAudioStreaming) && (
            <div className="px-3 py-2 border-t border-slate-800 space-y-1">
              {isScreenSharing && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">屏幕共享中</span>
                </div>
              )}
              {isAudioStreaming && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-400">音频传输中</span>
                </div>
              )}
            </div>
          )}
          {sidebarCollapsed && (isScreenSharing || isAudioStreaming) && (
            <div className="flex flex-col items-center py-2 border-t border-slate-800 gap-1">
              {isScreenSharing && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              {isAudioStreaming && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
            </div>
          )}

          {/* Device Info & Disconnect */}
          <div className="border-t border-slate-800 p-2 shrink-0">
            {connectedDevice && !sidebarCollapsed && (
              <div className="mb-2 px-1">
                <p className="text-xs font-medium truncate text-slate-300">{connectedDevice.name}</p>
                <p className="text-[10px] text-slate-500">{connectedDevice.host}:{connectedDevice.port}</p>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-slate-200"
                onClick={toggleSidebar}
              >
                {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={disconnect}
              >
                <Power className="h-3.5 w-3.5 mr-1" />
                {!sidebarCollapsed && '断开'}
              </Button>
            </div>
          </div>
        </motion.aside>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {renderPanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-3 gap-4 text-[10px] text-slate-400 shrink-0">
        {/* Connection Quality */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${qualityDot} animate-pulse`} />
          <span className={qualityColor}>{qualityLabel}</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-slate-700" />
        {/* Latency */}
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>{latency}ms</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-slate-700" />
        {/* Session Duration */}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{elapsed}</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-slate-700" />
        {/* Bandwidth */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3 text-cyan-400" />
            <span>{formatBytes(dataTransferred.up)}/s</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDown className="h-3 w-3 text-emerald-400" />
            <span>{formatBytes(dataTransferred.down)}/s</span>
          </div>
        </div>
        <Separator orientation="vertical" className="h-3 bg-slate-700" />
        {/* CPU / Memory mini */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            <div className="w-10 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cpuUsage > 80 ? 'bg-red-500' : cpuUsage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${cpuUsage}%` }}
              />
            </div>
            <span>{cpuUsage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <MemoryStick className="h-3 w-3" />
            <div className="w-10 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${memPct > 80 ? 'bg-red-500' : memPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${memPct}%` }}
              />
            </div>
            <span>{memPct}%</span>
          </div>
        </div>
        <Separator orientation="vertical" className="h-3 bg-slate-700" />
        {/* Data Transferred */}
        <div className="flex items-center gap-1">
          <Signal className="h-3 w-3" />
          <span>{formatBytes(dataTransferred.up + dataTransferred.down)}</span>
        </div>
        {/* Clock */}
        <div className="ml-auto text-[10px] text-slate-500">
          {new Date(now).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
