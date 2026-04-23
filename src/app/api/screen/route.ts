import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/screen - Start/stop screen sharing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, deviceId } = body;

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "start" or "stop"' },
        { status: 400 }
      );
    }

    // Log the screen sharing operation
    if (deviceId) {
      await db.operation.create({
        data: {
          deviceId,
          category: '屏幕',
          action: '屏幕共享',
          detail: action === 'start' ? '开始屏幕共享' : '停止屏幕共享',
          severity: 'info',
        },
      });
    }

    return NextResponse.json({
      success: true,
      action,
      message: action === 'start' ? '屏幕共享已开始' : '屏幕共享已停止',
    });
  } catch (error) {
    console.error('Failed to toggle screen sharing:', error);
    return NextResponse.json(
      { error: 'Failed to toggle screen sharing' },
      { status: 500 }
    );
  }
}
