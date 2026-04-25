'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRemoteStore } from '@/lib/store';
import type { Device, AddDeviceInput } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Monitor,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  ArrowRight,
  Globe,
  Server,
  Clock,
  Cpu,
  HardDrive,
  ChevronRight,
  Shield,
  Zap,
  Activity,
  Eye,
  Radio,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Download,
  MonitorSmartphone,
  TerminalSquare,
} from 'lucide-react';

// ─── Device hardware metadata ──────────────────────────────────────────────
interface DeviceMeta {
  osIcon: string;
  osVersion: string;
  tags: string[];
  cpu: number;
  memory: number;
  disk: number;
  cpuModel: string;
  memorySize: string;
  gpu: string;
  resolution: string;
  latency: number;
  uptime: string;
}

const deviceMetaMap: Record<string, DeviceMeta> = {
  '1': {
    osIcon: '\u{1F5A5}\uFE0F',
    osVersion: 'Windows 11 Pro',
    tags: ['工作', '主力机'],
    cpu: 23,
    memory: 54,
    disk: 50,
    cpuModel: 'Intel Core i7-13700K',
    memorySize: '32 GB DDR5',
    gpu: 'NVIDIA RTX 4070',
    resolution: '2560x1440',
    latency: 12,
    uptime: '3天 7小时',
  },
  '2': {
    osIcon: '\u{1F5A5}\uFE0F',
    osVersion: 'Windows 11 Home',
    tags: ['家庭', '个人'],
    cpu: 0,
    memory: 0,
    disk: 65,
    cpuModel: 'AMD Ryzen 5 5600X',
    memorySize: '16 GB DDR4',
    gpu: 'NVIDIA GTX 1660 Super',
    resolution: '1920x1080',
    latency: 0,
    uptime: '--',
  },
  '3': {
    osIcon: '\u{1F427}',
    osVersion: 'Ubuntu 22.04 LTS',
    tags: ['测试', 'CI/CD'],
    cpu: 45,
    memory: 62,
    disk: 38,
    cpuModel: 'Intel Xeon E-2388G',
    memorySize: '64 GB ECC',
    gpu: 'Intel UHD P750',
    resolution: '--',
    latency: 8,
    uptime: '15天 3小时',
  },
  '4': {
    osIcon: '\u{1F34E}',
    osVersion: 'macOS Sonoma 14.2',
    tags: ['开发', '设计'],
    cpu: 18,
    memory: 42,
    disk: 55,
    cpuModel: 'Apple M3 Pro',
    memorySize: '36 GB Unified',
    gpu: 'Apple M3 Pro GPU',
    resolution: '3024x1964',
    latency: 5,
    uptime: '7天 12小时',
  },
  '5': {
    osIcon: '\u{1F427}',
    osVersion: 'Debian 12',
    tags: ['开发', '生产'],
    cpu: 67,
    memory: 71,
    disk: 82,
    cpuModel: 'AMD EPYC 7543',
    memorySize: '128 GB ECC',
    gpu: 'ASPEED AST2500',
    resolution: '--',
    latency: 22,
    uptime: '45天 8小时',
  },
  '6': {
    osIcon: '\u{1F427}',
    osVersion: 'CentOS 8',
    tags: ['数据库', '生产'],
    cpu: 0,
    memory: 0,
    disk: 73,
    cpuModel: 'Intel Xeon Gold 6348',
    memorySize: '256 GB ECC',
    gpu: 'ASPEED AST2500',
    resolution: '--',
    latency: 0,
    uptime: '--',
  },
  '7': {
    osIcon: '\u{1F5A5}\uFE0F',
    osVersion: 'Windows 10 Pro',
    tags: ['会议', '共享'],
    cpu: 0,
    memory: 0,
    disk: 44,
    cpuModel: 'Intel Core i5-13400',
    memorySize: '16 GB DDR4',
    gpu: 'Intel UHD 730',
    resolution: '3840x2160',
    latency: 0,
    uptime: '--',
  },
  '8': {
    osIcon: '\u{1F427}',
    osVersion: 'Arch Linux',
    tags: ['监控', '运维'],
    cpu: 35,
    memory: 48,
    disk: 29,
    cpuModel: 'Intel Core i9-13900K',
    memorySize: '64 GB DDR5',
    gpu: 'NVIDIA RTX 3060',
    resolution: '2560x1440',
    latency: 15,
    uptime: '22天 5小时',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function getUsageColor(value: number): string {
  if (value >= 80) return 'bg-red-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getUsageTextColor(value: number): string {
  if (value >= 80) return 'text-red-500';
  if (value >= 60) return 'text-amber-500';
  return 'text-emerald-500';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

// ─── Floating icons for animated background ────────────────────────────────
const floatingIcons = [
  { icon: Monitor, x: '10%', y: '15%', delay: 0, duration: 8 },
  { icon: Globe, x: '80%', y: '10%', delay: 1.5, duration: 10 },
  { icon: Shield, x: '25%', y: '70%', delay: 3, duration: 9 },
  { icon: Cpu, x: '70%', y: '65%', delay: 0.5, duration: 7 },
  { icon: Server, x: '50%', y: '30%', delay: 2, duration: 11 },
  { icon: Activity, x: '90%', y: '45%', delay: 4, duration: 8 },
  { icon: Wifi, x: '15%', y: '50%', delay: 1, duration: 9 },
  { icon: HardDrive, x: '60%', y: '80%', delay: 2.5, duration: 10 },
];

// ─── Component ─────────────────────────────────────────────────────────────
export default function ConnectionPage() {
  const devices = useRemoteStore((s) => s.devices);
  const fetchDevices = useRemoteStore((s) => s.fetchDevices);
  const addDevice = useRemoteStore((s) => s.addDevice);
  const deleteDevice = useRemoteStore((s) => s.deleteDevice);
  const connect = useRemoteStore((s) => s.connect);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [osFilter, setOsFilter] = useState<'all' | 'windows' | 'linux' | 'macos'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState<AddDeviceInput>({ name: '', host: '', port: 9527, os: 'windows' });
  const [quickHost, setQuickHost] = useState('');
  const [quickPort, setQuickPort] = useState('9527');

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Stats
  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.status === 'online').length;
    const offline = total - online;
    const onlineDevices = devices.filter((d) => d.status === 'online');
    const avgLatency = onlineDevices.length > 0
      ? Math.round(
          onlineDevices.reduce((acc, d) => {
            const meta = deviceMetaMap[d.id];
            return acc + (meta?.latency ?? 0);
          }, 0) / onlineDevices.length
        )
      : 0;
    return { total, online, offline, avgLatency };
  }, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (osFilter !== 'all' && d.os !== osFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.host.toLowerCase().includes(q) ||
          d.os.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [devices, statusFilter, osFilter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDevices();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.host) return;
    await addDevice(newDevice);
    setNewDevice({ name: '', host: '', port: 9527, os: 'windows' });
    setAddDialogOpen(false);
  };

  const handleQuickConnect = async () => {
    if (!quickHost) return;
    const device = devices.find((d) => d.host === quickHost && String(d.port) === quickPort);
    if (device && device.status === 'online') {
      await connect(device);
    }
  };

  const handleConnect = async (device: Device) => {
    if (device.status === 'online') {
      await connect(device);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDevice(id);
  };

  // ─── Progress bar component ────────────────────────────────────────────
  const ProgressBar = ({ value, label }: { value: number; label: string }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={getUsageTextColor(value)}>{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getUsageColor(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* ── Animated Background ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Gradient blobs */}
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-teal-600/8 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-600/6 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating icons */}
        {floatingIcons.map(({ icon: Icon, x, y, delay, duration }, i) => (
          <motion.div
            key={i}
            className="absolute text-slate-700/20"
            style={{ left: x, top: y }}
            animate={{ y: [0, -20, 0], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
          >
            <Icon className="h-8 w-8" />
          </motion.div>
        ))}

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25"
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{ perspective: 600 }}
            >
              <Radio className="h-6 w-6 text-white" />
            </motion.div>
            <h1 className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              远程控制中心
            </h1>
          </div>
          <p className="mb-4 text-slate-400">安全、快速、可靠的多设备远程管理平台</p>

          {/* Security badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Shield className="mr-1 h-3 w-3" />
              QUIC协议
            </Badge>
            <Badge variant="outline" className="border-teal-500/30 bg-teal-500/10 text-teal-400">
              <Shield className="mr-1 h-3 w-3" />
              TLS 1.3
            </Badge>
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Shield className="mr-1 h-3 w-3" />
              端到端加密
            </Badge>
          </div>
        </motion.header>

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: '全部设备', value: stats.total, icon: Server, color: 'text-slate-300' },
            { label: '在线设备', value: stats.online, icon: Wifi, color: 'text-emerald-400' },
            { label: '离线设备', value: stats.offline, icon: WifiOff, color: 'text-slate-500' },
            { label: '平均延迟', value: `${stats.avgLatency}ms`, icon: Zap, color: 'text-amber-400' },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="border-slate-800 bg-slate-900/60 backdrop-blur-sm"
            >
              <CardContent className="flex items-center gap-3 p-4">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── Quick Connect Card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-900/60 backdrop-blur-sm">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Zap className="h-5 w-5 text-emerald-400" />
                快速连接
              </CardTitle>
              <CardDescription className="text-slate-400">
                输入设备地址直接连接
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-slate-400">主机地址</Label>
                  <Input
                    placeholder="例如: 192.168.1.100"
                    value={quickHost}
                    onChange={(e) => setQuickHost(e.target.value)}
                    className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                  />
                </div>
                <div className="w-full space-y-1.5 sm:w-32">
                  <Label className="text-slate-400">端口</Label>
                  <Input
                    placeholder="9527"
                    value={quickPort}
                    onChange={(e) => setQuickPort(e.target.value)}
                    className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                  />
                </div>
                <Button
                  onClick={handleQuickConnect}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 sm:w-auto"
                >
                  <ArrowRight className="mr-1 h-4 w-4" />
                  连接
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Download Section ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mb-8"
        >
          <Card className="border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-900/60 backdrop-blur-sm">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Download className="h-5 w-5 text-cyan-400" />
                下载桌面客户端
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">GUI 图形界面</Badge>
                <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[10px]">v1.1.0 最新版</Badge>
              </CardTitle>
              <CardDescription className="text-slate-400">
                下载带界面的桌面版程序，无需命令行操作
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* RC-Server GUI */}
                <div className="group rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 transition-all hover:border-emerald-500/30 hover:bg-slate-800/60">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Server className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">RC-Server 服务端 <span className="text-emerald-400 text-[11px] font-normal">v1.1.0</span></h3>
                      <p className="text-xs text-slate-500">带界面的 Windows 桌面版 · ~94MB</p>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-slate-400 leading-relaxed">
                    在被控端电脑上运行，图形界面一键启动/停止服务，实时查看连接状态和运行日志，支持系统托盘最小化。
                  </p>
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-emerald-400">✓</span> 图形界面控制服务启停
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-emerald-400">✓</span> 实时运行日志查看
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-emerald-400">✓</span> 连接管理与系统信息
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-emerald-400">✓</span> 系统托盘 &amp; 密码保护
                    </div>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500"
                  >
                    <a href="/downloads/RC-Server-GUI-v1.1.0.zip" download>
                      <Download className="mr-1.5 h-4 w-4" />
                      下载 RC-Server v1.1.0
                    </a>
                  </Button>
                </div>

                {/* RC-Client GUI */}
                <div className="group rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 transition-all hover:border-cyan-500/30 hover:bg-slate-800/60">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                      <MonitorSmartphone className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">RC-Client 客户端 <span className="text-cyan-400 text-[11px] font-normal">v1.1.0</span></h3>
                      <p className="text-xs text-slate-500">带界面的 Windows 桌面版 · ~94MB</p>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-slate-400 leading-relaxed">
                    在控制端电脑上运行，图形界面连接远程服务端，支持系统信息查看、文件管理、远程终端等功能。
                  </p>
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-cyan-400">✓</span> 图形界面连接远程服务
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-cyan-400">✓</span> 系统信息 &amp; 进程管理
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-cyan-400">✓</span> 文件浏览 &amp; 远程终端
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-cyan-400">✓</span> 自动重连 &amp; 连接历史
                    </div>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-sky-500"
                  >
                    <a href="/downloads/RC-Client-GUI-v1.1.0.zip" download>
                      <Download className="mr-1.5 h-4 w-4" />
                      下载 RC-Client v1.1.0
                    </a>
                  </Button>
                </div>
              </div>

              {/* Usage guide */}
              <div className="mt-4 rounded-lg border border-slate-700/30 bg-slate-900/40 p-3">
                <div className="flex items-start gap-2">
                  <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <p className="mb-1 font-medium text-slate-300">快速开始：</p>
                    <p>1. 下载并解压 <code className="rounded bg-slate-800 px-1 py-0.5 text-emerald-400">RC-Server-GUI-v1.1.0.zip</code>，双击运行 <code className="rounded bg-slate-800 px-1 py-0.5 text-emerald-400">RC-Server.exe</code></p>
                    <p>2. 在服务端界面点击 <code className="rounded bg-slate-800 px-1 py-0.5 text-emerald-400">启动服务</code> 按钮，默认监听 9527 端口</p>
                    <p>3. 下载并解压 <code className="rounded bg-slate-800 px-1 py-0.5 text-cyan-400">RC-Client-GUI-v1.1.0.zip</code>，双击运行 <code className="rounded bg-slate-800 px-1 py-0.5 text-cyan-400">RC-Client.exe</code></p>
                    <p>4. 在客户端输入服务端 IP 地址，点击连接即可开始远程控制</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Search & Filter Bar ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="搜索设备名称、地址或系统..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-slate-700 bg-slate-800/50 pl-10 text-white placeholder:text-slate-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'online' | 'offline')}>
            <SelectTrigger className="w-28 border-slate-700 bg-slate-800/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800 text-white">
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="online">在线</SelectItem>
              <SelectItem value="offline">离线</SelectItem>
            </SelectContent>
          </Select>

          {/* OS filter */}
          <Select value={osFilter} onValueChange={(v) => setOsFilter(v as 'all' | 'windows' | 'linux' | 'macos')}>
            <SelectTrigger className="w-32 border-slate-700 bg-slate-800/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800 text-white">
              <SelectItem value="all">全部系统</SelectItem>
              <SelectItem value="windows">Windows</SelectItem>
              <SelectItem value="linux">Linux</SelectItem>
              <SelectItem value="macos">macOS</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-none px-3 ${viewMode === 'grid' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-none px-3 ${viewMode === 'list' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>

          {/* Add device */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500"
              >
                <Plus className="mr-1 h-4 w-4" />
                添加设备
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">添加新设备</DialogTitle>
                <DialogDescription className="text-slate-400">
                  输入远程设备信息以添加到设备列表
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">设备名称</Label>
                  <Input
                    placeholder="例如: 办公室电脑"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">主机地址</Label>
                    <Input
                      placeholder="192.168.1.100"
                      value={newDevice.host}
                      onChange={(e) => setNewDevice({ ...newDevice, host: e.target.value })}
                      className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">端口</Label>
                    <Input
                      type="number"
                      value={newDevice.port}
                      onChange={(e) => setNewDevice({ ...newDevice, port: Number(e.target.value) })}
                      className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">操作系统</Label>
                  <Select value={newDevice.os} onValueChange={(v) => setNewDevice({ ...newDevice, os: v })}>
                    <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-800 text-white">
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="macos">macOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
                    取消
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleAddDevice}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
                >
                  添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* ── Device Grid / List ─────────────────────────────────────────── */}
        <div className="mb-12">
          {filteredDevices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center"
            >
              <Monitor className="mx-auto mb-3 h-12 w-12 text-slate-600" />
              <p className="text-slate-500">没有找到匹配的设备</p>
              <p className="text-sm text-slate-600">尝试调整搜索条件或过滤器</p>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredDevices.map((device, index) => {
                  const meta = deviceMetaMap[device.id];
                  const isOnline = device.status === 'online';
                  return (
                    <motion.div
                      key={device.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        className={`group relative border-slate-800 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOnline ? 'cursor-pointer hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10' : 'hover:border-slate-700'}`}
                        onClick={() => isOnline && handleConnect(device)}
                      >
                        <CardContent className="p-4">
                          {/* Top row: OS icon + name + badges */}
                          <div className="mb-3 flex items-start gap-3">
                            <div className="relative">
                              <span className="text-2xl">{meta?.osIcon ?? '\u{1F5A5}\uFE0F'}</span>
                              {isOnline && (
                                <motion.span
                                  className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-500"
                                  animate={{ scale: [1, 1.3, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-white">{device.name}</h3>
                                <Badge
                                  variant="outline"
                                  className={`shrink-0 text-[10px] ${
                                    isOnline
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                      : 'border-slate-600/30 bg-slate-600/10 text-slate-500'
                                  }`}
                                >
                                  {isOnline ? '在线' : '离线'}
                                </Badge>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {device.host}:{device.port}
                              </p>
                            </div>
                          </div>

                          {/* OS version + tags */}
                          <div className="mb-3">
                            <p className="mb-1.5 text-xs text-slate-400">{meta?.osVersion ?? device.os}</p>
                            <div className="flex flex-wrap gap-1">
                              {meta?.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="bg-slate-800 text-[10px] text-slate-400"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* CPU / Memory / Disk */}
                          {isOnline && meta && (
                            <div className="mb-3 space-y-2">
                              <ProgressBar value={meta.cpu} label="CPU" />
                              <ProgressBar value={meta.memory} label="内存" />
                              <ProgressBar value={meta.disk} label="磁盘" />
                            </div>
                          )}

                          {/* Hardware info */}
                          {meta && (
                            <div className="mb-3 rounded-lg bg-slate-800/50 p-2">
                              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Cpu className="h-2.5 w-2.5" />
                                  {meta.cpuModel}
                                </span>
                                <span className="flex items-center gap-1">
                                  <HardDrive className="h-2.5 w-2.5" />
                                  {meta.memorySize}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-2.5 w-2.5" />
                                  {meta.gpu}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Monitor className="h-2.5 w-2.5" />
                                  {meta.resolution}
                                </span>
                              </div>
                            </div>
                          )}

                          <Separator className="mb-3 bg-slate-800" />

                          {/* Bottom row: last seen, latency, uptime, actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {timeAgo(device.lastSeen)}
                              </span>
                              {isOnline && meta && (
                                <>
                                  <span className="flex items-center gap-0.5 text-emerald-400">
                                    <Zap className="h-2.5 w-2.5" />
                                    {meta.latency}ms
                                  </span>
                                  <span className="flex items-center gap-0.5">
                                    <Activity className="h-2.5 w-2.5" />
                                    {meta.uptime}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleConnect(device)}
                                disabled={!isOnline}
                                className={`h-7 px-3 text-xs ${
                                  isOnline
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                {isOnline ? (
                                  <>
                                    <ArrowRight className="mr-1 h-3 w-3" />
                                    连接
                                  </>
                                ) : (
                                  '唤醒连接'
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(device.id)}
                                className="h-7 w-7 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredDevices.map((device, index) => {
                  const meta = deviceMetaMap[device.id];
                  const isOnline = device.status === 'online';
                  return (
                    <motion.div
                      key={device.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <Card
                        className={`group border-slate-800 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOnline ? 'cursor-pointer hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10' : 'hover:border-slate-700'}`}
                        onClick={() => isOnline && handleConnect(device)}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          {/* OS icon */}
                          <div className="relative shrink-0">
                            <span className="text-2xl">{meta?.osIcon ?? '\u{1F5A5}\uFE0F'}</span>
                            {isOnline && (
                              <motion.span
                                className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-500"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </div>

                          {/* Device info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-white">{device.name}</h3>
                              <Badge
                                variant="outline"
                                className={`shrink-0 text-[10px] ${
                                  isOnline
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : 'border-slate-600/30 bg-slate-600/10 text-slate-500'
                                }`}
                              >
                                {isOnline ? '在线' : '离线'}
                              </Badge>
                              <span className="text-xs text-slate-500">{meta?.osVersion}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {device.host}:{device.port}
                              {meta && (
                                <>
                                  <span className="mx-2">|</span>
                                  <span>{meta.cpuModel}</span>
                                  <span className="mx-2">|</span>
                                  <span>{meta.memorySize}</span>
                                  <span className="mx-2">|</span>
                                  <span>{meta.gpu}</span>
                                </>
                              )}
                            </p>
                          </div>

                          {/* Tags */}
                          <div className="hidden items-center gap-1 sm:flex">
                            {meta?.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="bg-slate-800 text-[10px] text-slate-400"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Stats (online only) */}
                          {isOnline && meta && (
                            <div className="hidden items-center gap-4 text-xs xl:flex">
                              <span className={getUsageTextColor(meta.cpu)}>CPU {meta.cpu}%</span>
                              <span className={getUsageTextColor(meta.memory)}>内存 {meta.memory}%</span>
                              <span className={getUsageTextColor(meta.disk)}>磁盘 {meta.disk}%</span>
                            </div>
                          )}

                          {/* Latency / uptime */}
                          <div className="hidden items-center gap-3 text-[10px] text-slate-500 lg:flex">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(device.lastSeen)}
                            </span>
                            {isOnline && meta && (
                              <>
                                <span className="flex items-center gap-0.5 text-emerald-400">
                                  <Zap className="h-2.5 w-2.5" />
                                  {meta.latency}ms
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Activity className="h-2.5 w-2.5" />
                                  {meta.uptime}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleConnect(device)}
                              disabled={!isOnline}
                              className={`h-7 px-3 text-xs ${
                                isOnline
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500'
                                  : 'bg-slate-700 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              {isOnline ? (
                                <>
                                  <ArrowRight className="mr-1 h-3 w-3" />
                                  连接
                                </>
                              ) : (
                                '唤醒连接'
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(device.id)}
                              className="h-7 w-7 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Quick Start Section ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="mb-6 text-center text-2xl font-bold text-white">
            快速开始
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: '添加设备',
                desc: '输入远程设备的 IP 地址和端口，将其添加到设备列表中',
                icon: Plus,
                color: 'from-emerald-500 to-teal-500',
                shadowColor: 'shadow-emerald-500/20',
              },
              {
                step: '02',
                title: '建立连接',
                desc: '选择在线设备并点击连接按钮，通过加密通道安全接入',
                icon: ArrowRight,
                color: 'from-teal-500 to-cyan-500',
                shadowColor: 'shadow-teal-500/20',
              },
              {
                step: '03',
                title: '远程操控',
                desc: '享受文件管理、进程监控、系统信息查看等全方位远程控制功能',
                icon: Monitor,
                color: 'from-cyan-500 to-blue-500',
                shadowColor: 'shadow-cyan-500/20',
              },
            ].map((item) => (
              <Card
                key={item.step}
                className="border-slate-800 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 hover:border-slate-700"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} shadow-lg ${item.shadowColor}`}
                  >
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="mb-1 text-xs font-bold text-emerald-400">
                    STEP {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="border-t border-slate-800 pt-8 pb-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Radio className="h-4 w-4 text-emerald-500" />
            <span>远程控制中心</span>
            <ChevronRight className="h-3 w-3" />
            <span>安全 · 快速 · 可靠</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            使用 QUIC 协议传输 | TLS 1.3 加密 | 端到端加密保护
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
