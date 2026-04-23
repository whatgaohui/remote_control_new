import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/audio - Start/stop audio streaming
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, deviceId, volume } = body;

    if (!action || !['start', 'stop', 'setVolume'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "start", "stop", or "setVolume"' },
        { status: 400 }
      );
    }

    // Log the audio operation
    if (deviceId) {
      let detail = '';
      if (action === 'start') detail = '开始音频传输';
      else if (action === 'stop') detail = '停止音频传输';
      else if (action === 'setVolume') detail = `调整音量至 ${volume ?? 75}%`;

      await db.operation.create({
        data: {
          deviceId,
          category: '音频',
          action: '音频设置',
          detail,
          severity: 'info',
        },
      });
    }

    return NextResponse.json({
      success: true,
      action,
      message:
        action === 'start'
          ? '音频传输已开始'
          : action === 'stop'
            ? '音频传输已停止'
            : `音量已设置为 ${volume ?? 75}%`,
    });
  } catch (error) {
    console.error('Failed to toggle audio streaming:', error);
    return NextResponse.json(
      { error: 'Failed to toggle audio streaming' },
      { status: 500 }
    );
  }
}
