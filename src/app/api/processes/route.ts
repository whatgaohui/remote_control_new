import { NextResponse } from 'next/server';

// GET /api/processes - Return mock process list
export async function GET() {
  try {
    const mockProcesses = [
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

    return NextResponse.json(mockProcesses);
  } catch (error) {
    console.error('Failed to fetch processes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processes' },
      { status: 500 }
    );
  }
}
