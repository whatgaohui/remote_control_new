import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/operations - Return operation logs (from DB or mock fallback)
export async function GET() {
  try {
    const operations = await db.operation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (operations.length > 0) {
      const serialized = operations.map((op) => ({
        ...op,
        createdAt: op.createdAt.toISOString(),
      }));
      return NextResponse.json(serialized);
    }

    // Fallback to mock data if DB is empty
    const mockOperations = [
      { id: '1', deviceId: '1', category: '连接', action: '建立连接', detail: '连接到办公室电脑', severity: 'info', createdAt: new Date(Date.now() - 300000).toISOString() },
      { id: '2', deviceId: '1', category: '文件', action: '上传文件', detail: '上传 report.docx (2.4 MB)', severity: 'info', createdAt: new Date(Date.now() - 600000).toISOString() },
      { id: '3', deviceId: '1', category: '系统', action: '进程管理', detail: '终止进程 chrome.exe (PID: 2048)', severity: 'warning', createdAt: new Date(Date.now() - 900000).toISOString() },
      { id: '4', deviceId: '1', category: '屏幕', action: '屏幕共享', detail: '开始屏幕共享', severity: 'info', createdAt: new Date(Date.now() - 1200000).toISOString() },
      { id: '5', deviceId: '1', category: '连接', action: '断开连接', detail: '主动断开连接', severity: 'warning', createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: '6', deviceId: '1', category: '文件', action: '下载文件', detail: '下载 config.json (512 B)', severity: 'info', createdAt: new Date(Date.now() - 2400000).toISOString() },
      { id: '7', deviceId: '1', category: '音频', action: '音频设置', detail: '调整音量至 75%', severity: 'info', createdAt: new Date(Date.now() - 3000000).toISOString() },
      { id: '8', deviceId: '1', category: '系统', action: '系统告警', detail: 'CPU 使用率超过 90%', severity: 'error', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ];

    return NextResponse.json(mockOperations);
  } catch (error) {
    console.error('Failed to fetch operations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operations' },
      { status: 500 }
    );
  }
}
