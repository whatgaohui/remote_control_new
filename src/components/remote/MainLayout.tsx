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
} from 'lucide-react';

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
function ProgressBar({ value, max = 100, className = '', colorClass = 'bg-primary' }: { value: number; max?: number; className?: string; colorClass?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-2 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Mini Circular Gauge ───
function MiniGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
        <circle cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 88, height: 88 }}>
        <span className="text-lg font-bold">{value}%</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

// ─── Dashboard Panel ───
function DashboardPanel() {
  const { systemInfo, latency, latencyHistory, operationLogs } = useRemoteStore();
  const si = systemInfo;
  const cpuUsage = si?.cpu.usage ?? 0;
  const memUsage = si ? Math.round((si.memory.used / si.memory.total) * 100) : 0;
  const diskInfo = si?.disks[0];
  const diskUsage = diskInfo ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0;
  const netInfo = si?.network[0];

  const cpuColor = cpuUsage > 80 ? '#ef4444' : cpuUsage > 50 ? '#f59e0b' : '#22c55e';
  const memColor = memUsage > 80 ? '#ef4444' : memUsage > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'CPU 使用率', value: `${cpuUsage}%`, icon: Cpu, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: '内存使用', value: `${memUsage}%`, icon: MemoryStick, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: '磁盘使用', value: `${diskUsage}%`, icon: HardDrive, color: 'text-sky-500', bg: 'bg-sky-500/10' },
          { label: '网络延迟', value: `${latency}ms`, icon: Network, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gauges and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">CPU 仪表</CardTitle></CardHeader>
          <CardContent className="flex justify-center pt-0">
            <div className="relative">
              <MiniGauge value={cpuUsage} label="CPU" color={cpuColor} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">内存仪表</CardTitle></CardHeader>
          <CardContent className="flex justify-center pt-0">
            <div className="relative">
              <MiniGauge value={memUsage} label="内存" color={memColor} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">网络流量</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="h-24 flex items-end gap-1">
              {latencyHistory.slice(-20).map((v, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t bg-primary/60 min-w-[3px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (v / 50) * 100)}%` }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>0ms</span><span>50ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">最近活动</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {operationLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs py-1">
                    {log.severity === 'info' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /> :
                     log.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" /> :
                     <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{log.detail}</p>
                      <p className="text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">快捷操作</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '屏幕截图', icon: Camera, color: 'text-sky-500' },
                { label: '重启远程', icon: RefreshCw, color: 'text-amber-500' },
                { label: '任务管理', icon: Activity, color: 'text-emerald-500' },
                { label: '系统信息', icon: Info, color: 'text-purple-500' },
              ].map((action) => (
                <Button key={action.label} variant="outline" className="justify-start gap-2 h-9 text-xs">
                  <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                  {action.label}
                </Button>
              ))}
            </div>
            {netInfo && (
              <div className="mt-3 p-2 rounded-lg bg-muted/50 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">接口</span><span>{netInfo.interface}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span>{netInfo.ip}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">速度</span><span>{netInfo.speed}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">发送</span><span>{formatBytes(netInfo.sent)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">接收</span><span>{formatBytes(netInfo.received)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Screen Panel ───
function ScreenPanel() {
  const { isScreenSharing, toggleScreenSharing } = useRemoteStore();
  const [resolution, setResolution] = useState('1920x1080');
  const [quality, setQuality] = useState('high');
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const desktopIcons = [
    { name: '我的电脑', icon: Monitor },
    { name: '回收站', icon: Trash2 },
    { name: '文档', icon: FileText },
    { name: '网络', icon: Globe },
  ];

  const taskbarApps = ['开始', 'Chrome', 'VS Code', '文件管理器', '终端'];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant={isScreenSharing ? 'destructive' : 'default'}
          size="sm"
          onClick={toggleScreenSharing}
          className="gap-2"
        >
          {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          {isScreenSharing ? '停止共享' : '开始共享'}
        </Button>
        <Select value={resolution} onValueChange={setResolution}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1920x1080">1920 x 1080</SelectItem>
            <SelectItem value="1280x720">1280 x 720</SelectItem>
            <SelectItem value="3840x2160">3840 x 2160</SelectItem>
          </SelectContent>
        </Select>
        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">低画质</SelectItem>
            <SelectItem value="medium">中画质</SelectItem>
            <SelectItem value="high">高画质</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-2">
          <Camera className="h-4 w-4" /> 截图
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Maximize2 className="h-4 w-4" /> 全屏
        </Button>
      </div>

      {/* Simulated Desktop */}
      <Card className="overflow-hidden">
        <div
          className="relative bg-gradient-to-br from-sky-400 to-indigo-500 dark:from-sky-900 dark:to-indigo-950 cursor-crosshair"
          style={{ aspectRatio: '16/9' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({
              x: ((e.clientX - rect.left) / rect.width) * 100,
              y: ((e.clientY - rect.top) / rect.height) * 100,
            });
          }}
        >
          {/* Desktop Icons */}
          <div className="absolute inset-0 p-4">
            <div className="grid grid-cols-1 gap-4 w-fit">
              {desktopIcons.map((item) => (
                <div key={item.name} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/20 cursor-pointer transition-colors w-16">
                  <item.icon className="h-8 w-8 text-white drop-shadow" />
                  <span className="text-[10px] text-white text-center drop-shadow leading-tight">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mouse Cursor */}
          <motion.div
            className="absolute pointer-events-none z-10"
            animate={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <MousePointer2 className="h-5 w-5 text-white drop-shadow-lg" />
          </motion.div>

          {/* Not Connected Overlay */}
          {!isScreenSharing && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
              <MonitorOff className="h-12 w-12 text-white/60" />
              <p className="text-white/80 text-sm">点击"开始共享"查看远程桌面</p>
            </div>
          )}
        </div>

        {/* Taskbar */}
        <div className="bg-gray-900 dark:bg-gray-950 flex items-center px-2 h-8 gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-white hover:bg-white/20">
            <AppWindow className="h-3 w-3 mr-1" /> 开始
          </Button>
          <Separator orientation="vertical" className="h-4 bg-white/20" />
          {taskbarApps.slice(1).map((app) => (
            <Button key={app} variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-white/70 hover:bg-white/20">
              {app}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-[10px] text-white/70">
            <Volume2 className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Files Panel ───
function FilesPanel() {
  const { files, currentPath, setCurrentPath, fileSearch, setFileSearch } = useRemoteStore();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const pathParts = currentPath.split('\\').filter(Boolean);
  const filteredFiles = files.filter((f) =>
    !fileSearch || f.name.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const getFileIcon = (file: typeof files[0]) => {
    if (file.type === 'folder') return <Folder className="h-4 w-4 text-amber-500" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'exe') return <Settings className="h-4 w-4 text-gray-500" />;
    if (ext === 'json') return <FileText className="h-4 w-4 text-yellow-500" />;
    if (ext === 'xlsx') return <FileText className="h-4 w-4 text-emerald-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setCurrentPath('C:\\')}>
          <HardDrive className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const parent = currentPath.split('\\').slice(0, -1).join('\\');
          if (parent) setCurrentPath(parent);
        }}>
          <ArrowUp className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 min-w-0 overflow-x-auto">
          {pathParts.map((part, i) => (
            <div key={i} className="flex items-center shrink-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => setCurrentPath(pathParts.slice(0, i + 1).join('\\'))}
              >
                {part}
              </Button>
            </div>
          ))}
        </div>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索文件..."
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1">
          <Upload className="h-4 w-4" /> 上传
        </Button>
        <Button variant="outline" size="sm" className="gap-1">
          <FolderPlus className="h-4 w-4" /> 新建
        </Button>
        <div className="flex border rounded-md">
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
        <Card>
          <div className="grid grid-cols-[1fr_100px_140px] gap-2 px-4 py-2 text-xs text-muted-foreground border-b font-medium">
            <span>名称</span><span>大小</span><span>修改日期</span>
          </div>
          <ScrollArea className="max-h-96">
            {filteredFiles.map((file) => (
              <div
                key={file.name}
                className="grid grid-cols-[1fr_100px_140px] gap-2 px-4 py-2 text-xs hover:bg-muted/50 cursor-pointer transition-colors items-center border-b last:border-b-0"
                onDoubleClick={() => file.type === 'folder' && setCurrentPath(file.path)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(file)}
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="text-muted-foreground">{file.type === 'folder' ? '--' : formatBytes(file.size)}</span>
                <span className="text-muted-foreground">{file.modified}</span>
              </div>
            ))}
          </ScrollArea>
        </Card>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {filteredFiles.map((file) => (
            <div
              key={file.name}
              className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onDoubleClick={() => file.type === 'folder' && setCurrentPath(file.path)}
            >
              {file.type === 'folder'
                ? <Folder className="h-8 w-8 text-amber-500" />
                : <File className="h-8 w-8 text-muted-foreground" />}
              <span className="text-[10px] text-center truncate w-full">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Transfers Panel ───
function TransfersPanel() {
  const { fileTransfers } = useRemoteStore();
  const active = fileTransfers.filter((t) => t.status === 'transferring').length;
  const completed = fileTransfers.filter((t) => t.status === 'completed').length;
  const pending = fileTransfers.filter((t) => t.status === 'pending').length;

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-emerald-500';
    if (s === 'transferring') return 'bg-sky-500';
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
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-sky-500">{active}</p><p className="text-xs text-muted-foreground">传输中</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-500">{completed}</p><p className="text-xs text-muted-foreground">已完成</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-500">{pending}</p><p className="text-xs text-muted-foreground">等待中</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">传输列表</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {fileTransfers.map((t) => (
                <div key={t.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {t.direction === 'upload' ? <ArrowUp className="h-4 w-4 text-sky-500 shrink-0" /> : <ArrowDown className="h-4 w-4 text-emerald-500 shrink-0" />}
                      <span className="text-sm truncate">{t.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${statusColor(t.status)} text-white border-0`}>
                        {statusLabel(t.status)}
                      </Badge>
                    </div>
                  </div>
                  <ProgressBar value={t.progress} colorClass={statusColor(t.status)} />
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
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

// ─── Clipboard Panel ───
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
    if (/^https?:\/\//.test(text)) return { label: 'URL', color: 'text-sky-500', icon: Globe };
    if (/^\d+$/.test(text)) return { label: '数字', color: 'text-purple-500', icon: Hash };
    return { label: '文本', color: 'text-emerald-500', icon: FileText };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">发送到远程剪贴板</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Textarea
            placeholder="输入要发送的内容..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAdd} className="gap-2">
              <Copy className="h-4 w-4" /> 发送
            </Button>
            {input && (
              <Badge variant="outline" className="text-xs">
                {detectType(input).label}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">剪贴板历史</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="max-h-72">
            {clipboardItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">暂无剪贴板内容</p>
            ) : (
              <div className="space-y-2">
                {clipboardItems.map((item, i) => {
                  const dt = detectType(item);
                  return (
                    <motion.div
                      key={`${item}-${i}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-2 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <dt.icon className={`h-4 w-4 mt-0.5 shrink-0 ${dt.color}`} />
                      <span className="flex-1 text-sm break-all">{item}</span>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigator.clipboard?.writeText(item)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeClipboardItem(i)}>
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

// Hash icon fallback (lucide doesn't export it directly)
function Hash({ className }: { className?: string }) {
  return <span className={`font-bold ${className}`}>#</span>;
}

// ─── Processes Panel ───
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{processes.length}</p><p className="text-xs text-muted-foreground">进程数</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-500">{totalCpu.toFixed(1)}%</p><p className="text-xs text-muted-foreground">总 CPU</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-500">{totalMem.toFixed(1)}%</p><p className="text-xs text-muted-foreground">总内存</p></CardContent></Card>
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="搜索进程..." value={processSearch} onChange={(e) => setProcessSearch(e.target.value)} className="h-8 text-xs pl-7" />
        </div>
        <Select value={processSortBy} onValueChange={(v) => setProcessSortBy(v as 'cpu' | 'memory' | 'name')}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cpu">CPU 排序</SelectItem>
            <SelectItem value="memory">内存排序</SelectItem>
            <SelectItem value="name">名称排序</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Process Table */}
      <Card>
        <ScrollArea className="max-h-96">
          <div className="grid grid-cols-[50px_1fr_80px_80px_60px_50px] gap-1 px-4 py-2 text-[10px] text-muted-foreground border-b font-medium">
            <span>PID</span><span>名称</span><span>CPU</span><span>内存</span><span>线程</span><span>状态</span>
          </div>
          {filtered.map((p) => (
            <div
              key={p.pid}
              className="grid grid-cols-[50px_1fr_80px_80px_60px_50px] gap-1 px-4 py-2 text-xs hover:bg-muted/30 transition-colors items-center border-b last:border-b-0"
            >
              <span className="text-muted-foreground">{p.pid}</span>
              <span className="font-medium truncate">{p.name}</span>
              <div className="flex items-center gap-1">
                <div className="w-12"><ProgressBar value={p.cpuUsage} max={20} colorClass={p.cpuUsage > 10 ? 'bg-red-500' : p.cpuUsage > 5 ? 'bg-amber-500' : 'bg-emerald-500'} className="h-1.5" /></div>
                <span className="text-[10px] w-8">{p.cpuUsage}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-12"><ProgressBar value={p.memoryUsage} max={30} colorClass={p.memoryUsage > 15 ? 'bg-red-500' : p.memoryUsage > 8 ? 'bg-amber-500' : 'bg-emerald-500'} className="h-1.5" /></div>
                <span className="text-[10px] w-8">{p.memoryUsage}%</span>
              </div>
              <span className="text-muted-foreground text-[10px]">{p.threads}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-emerald-500/10 text-emerald-600 border-emerald-200">{p.status}</Badge>
            </div>
          ))}
        </ScrollArea>
      </Card>
    </div>
  );
}

// ─── System Panel ───
function SystemPanel() {
  const { systemInfo } = useRemoteStore();
  if (!systemInfo) return <p className="text-muted-foreground text-sm">加载中...</p>;
  const si = systemInfo;
  const memPct = Math.round((si.memory.used / si.memory.total) * 100);

  return (
    <div className="space-y-4">
      {/* OS Info */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">操作系统</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">系统</span><p className="font-medium">{si.os}</p></div>
            <div><span className="text-muted-foreground">版本</span><p className="font-medium">{si.osVersion}</p></div>
            <div><span className="text-muted-foreground">主机名</span><p className="font-medium">{si.hostname}</p></div>
            <div><span className="text-muted-foreground">运行时间</span><p className="font-medium">{formatDuration(si.uptime * 1000)}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* CPU */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">CPU - {si.cpu.model}</CardTitle>
            <div className="flex items-center gap-1.5">
              <Thermometer className={`h-3.5 w-3.5 ${si.cpu.temperature > 80 ? 'text-red-500' : si.cpu.temperature > 60 ? 'text-amber-500' : 'text-emerald-500'}`} />
              <span className="text-xs">{si.cpu.temperature}°C</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground w-8">总</span>
            <ProgressBar value={si.cpu.usage} colorClass={si.cpu.usage > 80 ? 'bg-red-500' : si.cpu.usage > 50 ? 'bg-amber-500' : 'bg-emerald-500'} />
            <span className="text-xs w-8">{si.cpu.usage}%</span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {si.cpu.perCore.map((usage, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="w-full h-10 bg-muted rounded-sm overflow-hidden flex flex-col justify-end">
                  <motion.div
                    className={`w-full ${usage > 80 ? 'bg-red-500' : usage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${usage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-[8px] text-muted-foreground">{i}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Memory */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">内存</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-2">
            <ProgressBar value={memPct} colorClass={memPct > 80 ? 'bg-red-500' : memPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'} />
            <span className="text-xs w-12">{memPct}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div><p className="text-muted-foreground">总计</p><p className="font-medium">{formatBytes(si.memory.total)}</p></div>
            <div><p className="text-muted-foreground">已用</p><p className="font-medium">{formatBytes(si.memory.used)}</p></div>
            <div><p className="text-muted-foreground">可用</p><p className="font-medium">{formatBytes(si.memory.available)}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Disks */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">磁盘</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          {si.disks.map((d) => {
            const pct = Math.round((d.used / d.total) * 100);
            return (
              <div key={d.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{formatBytes(d.used)} / {formatBytes(d.total)}</span>
                </div>
                <ProgressBar value={pct} colorClass={pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-sky-500'} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Network */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">网络</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {si.network.map((n) => (
              <div key={n.interface} className="p-2 rounded-lg border text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{n.interface}</span>
                  <Badge variant="outline" className="text-[10px]">{n.speed}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
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

// ─── Audio Panel ───
function AudioPanel() {
  const { audioVolume, setAudioVolume, isAudioStreaming, toggleAudioStreaming } = useRemoteStore();
  const [codec, setCodec] = useState('opus');
  const [visualizerBars] = useState(() => Array.from({ length: 16 }, () => Math.random()));
  const [eqValues, setEqValues] = useState([60, 70, 80, 75, 65, 55]);

  const eqLabels = ['60Hz', '250Hz', '1kHz', '4kHz', '8kHz', '16kHz'];

  return (
    <div className="space-y-4">
      {/* Volume Control */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">音量控制</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-3">
            {isAudioStreaming ? <Speaker className="h-5 w-5 text-emerald-500" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
            <Slider value={[audioVolume]} onValueChange={(v) => setAudioVolume(v[0])} max={100} step={1} className="flex-1" />
            <span className="text-sm font-medium w-10 text-right">{audioVolume}%</span>
          </div>
          <div className="flex gap-2">
            <Button variant={isAudioStreaming ? 'destructive' : 'default'} size="sm" onClick={toggleAudioStreaming} className="gap-2">
              {isAudioStreaming ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isAudioStreaming ? '停止音频' : '开始音频'}
            </Button>
            <Select value={codec} onValueChange={setCodec}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="opus">Opus</SelectItem>
                <SelectItem value="aac">AAC</SelectItem>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="pcm">PCM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equalizer */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">均衡器</CardTitle></CardHeader>
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
                <span className="text-[9px] text-muted-foreground">{eqLabels[i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audio Visualizer */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">音频可视化</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="h-24 flex items-end justify-center gap-1">
            {visualizerBars.map((base, i) => (
              <motion.div
                key={i}
                className="w-3 bg-primary/60 rounded-t"
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
            <p className="text-center text-xs text-muted-foreground mt-2">开始音频传输以查看可视化</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Terminal Panel ───
function TerminalPanel() {
  const { terminalHistory, addTerminalCommand } = useRemoteStore();
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = ['dir', 'cd', 'tasklist', 'ipconfig', 'systeminfo', 'ping', 'netstat', 'cls'];

  const handleSubmit = () => {
    if (input.trim()) {
      addTerminalCommand(input.trim());
      setInput('');
      setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = historyIndex + 1;
      if (newIndex < terminalHistory.length) {
        setHistoryIndex(newIndex);
        setInput(terminalHistory[terminalHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setInput(terminalHistory[terminalHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-gray-900 dark:bg-gray-950 text-green-400 font-mono text-xs">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 dark:bg-gray-900">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <span className="text-gray-400 text-xs ml-2">Windows PowerShell</span>
          </div>
          {/* Terminal Output */}
          <div ref={scrollRef} className="p-3 h-72 overflow-y-auto custom-scrollbar">
            <p className="text-gray-500">Microsoft Windows [Version 10.0.22631]</p>
            <p className="text-gray-500">(c) Microsoft Corporation. All rights reserved.</p>
            <br />
            {terminalHistory.map((cmd, i) => (
              <div key={i}>
                <p><span className="text-gray-400">PS C:\Users\Admin&gt; </span>{cmd}</p>
                <p className="text-gray-500 mt-0.5">
                  {cmd === 'dir' ? ' 目录项已列出...' : cmd === 'cls' ? '' : `命令 "${cmd}" 已执行`}
                </p>
              </div>
            ))}
          </div>
          {/* Input */}
          <div className="flex items-center px-3 py-2 border-t border-gray-800">
            <span className="text-gray-400 mr-1">PS C:\Users\Admin&gt;</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-green-400 caret-green-400"
              placeholder="输入命令..."
            />
          </div>
        </div>
      </Card>

      {/* Command Suggestions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">常用命令</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((cmd) => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                className="text-xs font-mono"
                onClick={() => { addTerminalCommand(cmd); }}
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

// ─── Logs Panel ───
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
    if (s === 'info') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const severityBg = (s: string) => {
    if (s === 'info') return 'bg-emerald-500/10';
    if (s === 'warning') return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div className="space-y-4">
      {/* Severity Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><div><p className="text-lg font-bold">{infoCount}</p><p className="text-[10px] text-muted-foreground">信息</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><div><p className="text-lg font-bold">{warnCount}</p><p className="text-[10px] text-muted-foreground">警告</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-500" /><div><p className="text-lg font-bold">{errCount}</p><p className="text-[10px] text-muted-foreground">错误</p></div></CardContent></Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="搜索日志..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs pl-7" />
        </div>
        <Select value={logCategoryFilter} onValueChange={setLogCategoryFilter}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c === 'all' ? '全部' : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log List */}
      <Card>
        <ScrollArea className="max-h-96">
          <div className="divide-y">
            {filtered.map((log) => (
              <div key={log.id} className={`flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors ${severityBg(log.severity)}`}>
                <div className="mt-0.5 shrink-0">{severityIcon(log.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px] h-4">{log.category}</Badge>
                    <span className="text-xs font-medium">{log.action}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

// ─── Download Panel ───
function DownloadPanel() {
  const downloads = [
    {
      name: 'rc-server.exe',
      desc: '远程控制服务端 - 安装在需要被远程控制的电脑上',
      version: 'v2.1.0',
      size: '12.5 MB',
      platform: 'Windows',
      icon: Monitor,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
    },
    {
      name: 'rc-client.exe',
      desc: '远程控制客户端 - 安装在用于远程控制的电脑上',
      version: 'v2.1.0',
      size: '8.3 MB',
      platform: 'Windows',
      icon: Command,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">下载中心</h2>
        <p className="text-sm text-muted-foreground mt-1">下载远程控制组件，开始远程管理您的设备</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {downloads.map((dl) => (
          <Card key={dl.name} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${dl.bg}`}>
                  <dl.icon className={`h-8 w-8 ${dl.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{dl.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{dl.desc}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px]">{dl.version}</Badge>
                    <Badge variant="outline" className="text-[10px]">{dl.size}</Badge>
                    <Badge variant="outline" className="text-[10px]">{dl.platform}</Badge>
                  </div>
                  <Button className="mt-4 w-full gap-2" size="sm">
                    <Download className="h-4 w-4" /> 下载
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">安装说明</CardTitle></CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
          <p>1. 在被控端电脑上运行 <code className="bg-muted px-1 py-0.5 rounded text-foreground">rc-server.exe</code>，默认监听端口 9527</p>
          <p>2. 确保防火墙允许 9527 端口的入站连接</p>
          <p>3. 在控制端使用本应用连接到被控端的 IP 地址和端口</p>
          <p>4. 首次连接需要在被控端确认授权</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Settings Panel ───
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
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="space-y-4">
      {/* Connection */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wifi className="h-4 w-4" /> 连接设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm">自动连接</p><p className="text-[10px] text-muted-foreground">启动时自动连接上次设备</p></div>
            <Switch checked={settings.autoConnect} onCheckedChange={() => toggle('autoConnect')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="text-sm">断开确认</p><p className="text-[10px] text-muted-foreground">断开连接前弹出确认</p></div>
            <Switch checked={settings.confirmDisconnect} onCheckedChange={() => toggle('confirmDisconnect')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="text-sm">加密传输</p><p className="text-[10px] text-muted-foreground">使用 TLS 加密所有数据传输</p></div>
            <Switch checked={settings.encryptTransfer} onCheckedChange={() => toggle('encryptTransfer')} />
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4" /> 显示设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm">高清画质</p><p className="text-[10px] text-muted-foreground">优先画质而非帧率</p></div>
            <Switch checked={settings.highQualityScreen} onCheckedChange={() => toggle('highQualityScreen')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="text-sm">低延迟模式</p><p className="text-[10px] text-muted-foreground">优先响应速度</p></div>
            <Switch checked={settings.lowLatencyMode} onCheckedChange={() => toggle('lowLatencyMode')} />
          </div>
        </CardContent>
      </Card>

      {/* Audio */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Volume2 className="h-4 w-4" /> 音频设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <Label className="text-sm">默认音量</Label>
            <div className="flex items-center gap-3 mt-1">
              <Slider value={[audioVolume]} onValueChange={(v) => setAudioVolume(v[0])} max={100} step={1} className="flex-1" />
              <span className="text-sm w-10 text-right">{audioVolume}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> 通知设置</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm">桌面通知</p><p className="text-[10px] text-muted-foreground">接收系统桌面通知</p></div>
            <Switch checked={settings.showNotifications} onCheckedChange={() => toggle('showNotifications')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="text-sm">声音提醒</p><p className="text-[10px] text-muted-foreground">事件触发时播放提示音</p></div>
            <Switch checked={settings.soundNotifications} onCheckedChange={() => toggle('soundNotifications')} />
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Keyboard className="h-4 w-4" /> 快捷键</CardTitle></CardHeader>
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
              <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="bg-background border rounded px-1.5 py-0.5 text-[10px] font-mono">{key}</kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4" /> 关于</CardTitle></CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
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

// ─── Main Layout Component ───
export default function MainLayout() {
  const {
    activeTab, setActiveTab, connectedDevice, disconnect,
    latency, connectStartTime, isScreenSharing, isAudioStreaming,
    sidebarCollapsed, toggleSidebar, systemInfo,
  } = useRemoteStore();

  const [elapsed, setElapsed] = useState('00:00:00');
  const [now, setNow] = useState(Date.now());

  // Timer for connection duration
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (connectStartTime) {
        setElapsed(formatDuration(Date.now() - connectStartTime));
      }
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
    <div className="h-screen flex flex-col bg-background">
      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          className="flex flex-col border-r bg-card shrink-0 overflow-hidden"
          animate={{ width: sidebarCollapsed ? 56 : 220 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {/* Logo */}
          <div className="h-12 flex items-center gap-2 px-3 border-b shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-semibold text-sm whitespace-nowrap"
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
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{tab.label}</span>
                        <span className={`text-[9px] font-mono ${isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
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
            <div className="px-3 py-2 border-t space-y-1">
              {isScreenSharing && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600">屏幕共享中</span>
                </div>
              )}
              {isAudioStreaming && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-sky-600">音频传输中</span>
                </div>
              )}
            </div>
          )}
          {(sidebarCollapsed) && (isScreenSharing || isAudioStreaming) && (
            <div className="flex flex-col items-center py-2 border-t gap-1">
              {isScreenSharing && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              {isAudioStreaming && <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />}
            </div>
          )}

          {/* Device Info & Disconnect */}
          <div className="border-t p-2 shrink-0">
            {connectedDevice && !sidebarCollapsed && (
              <div className="mb-2 px-1">
                <p className="text-xs font-medium truncate">{connectedDevice.name}</p>
                <p className="text-[10px] text-muted-foreground">{connectedDevice.host}:{connectedDevice.port}</p>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={toggleSidebar}
              >
                {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
      <div className="h-7 border-t bg-card flex items-center px-3 gap-4 text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${true ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span>已连接</span>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>{latency}ms</span>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{elapsed}</span>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cpuUsage > 80 ? 'bg-red-500' : cpuUsage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${cpuUsage}%` }}
              />
            </div>
            <span>{cpuUsage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <MemoryStick className="h-3 w-3" />
            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${memPct > 80 ? 'bg-red-500' : memPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${memPct}%` }}
              />
            </div>
            <span>{memPct}%</span>
          </div>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <div className="flex items-center gap-1">
          <ArrowUp className="h-3 w-3 text-sky-500" />
          <span>12.5 KB/s</span>
          <ArrowDown className="h-3 w-3 text-emerald-500 ml-1" />
          <span>45.2 KB/s</span>
        </div>
        <div className="ml-auto text-[10px]">
          {new Date(now).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
