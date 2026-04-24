import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/connections/[id] - Disconnect a connection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const connection = await db.connection.findUnique({
      where: { id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Update connection status
    const updated = await db.connection.update({
      where: { id },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
      },
    });

    // Update device status to offline
    await db.device.update({
      where: { id: connection.deviceId },
      data: { status: 'offline', lastSeen: new Date() },
    });

    // Log the disconnect operation
    await db.operation.create({
      data: {
        deviceId: connection.deviceId,
        category: '连接',
        action: '断开连接',
        detail: '主动断开连接',
        severity: 'warning',
      },
    });

    const serialized = {
      ...updated,
      connectedAt: updated.connectedAt.toISOString(),
      disconnectedAt: updated.disconnectedAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Failed to disconnect:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
