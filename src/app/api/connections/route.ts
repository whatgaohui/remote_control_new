import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/connections - Create a connection (auto-create device if not exists)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, name, host, port, os } = body;

    let targetDeviceId = deviceId;

    // If deviceId is provided, check if device exists; otherwise create one
    if (deviceId) {
      const existingDevice = await db.device.findUnique({
        where: { id: deviceId },
      });

      if (!existingDevice) {
        // Auto-create device if not found to avoid foreign key errors
        const newDevice = await db.device.create({
          data: {
            id: deviceId,
            name: name || `Device-${deviceId.slice(0, 6)}`,
            host: host || '0.0.0.0',
            port: port || 9527,
            os: os || 'windows',
            status: 'online',
          },
        });
        targetDeviceId = newDevice.id;
      } else {
        // Update device status to online
        await db.device.update({
          where: { id: deviceId },
          data: { status: 'online', lastSeen: new Date() },
        });
      }
    } else if (name && host) {
      // Create a new device if name and host are provided without deviceId
      const newDevice = await db.device.create({
        data: {
          name,
          host,
          port: port || 9527,
          os: os || 'windows',
          status: 'online',
        },
      });
      targetDeviceId = newDevice.id;
    } else {
      return NextResponse.json(
        { error: 'deviceId or (name and host) is required' },
        { status: 400 }
      );
    }

    // Close any existing active connections for this device
    await db.connection.updateMany({
      where: { deviceId: targetDeviceId, status: 'active' },
      data: { status: 'disconnected', disconnectedAt: new Date() },
    });

    // Create new connection
    const connection = await db.connection.create({
      data: {
        deviceId: targetDeviceId,
        status: 'active',
      },
    });

    // Log the connection operation
    await db.operation.create({
      data: {
        deviceId: targetDeviceId,
        category: '连接',
        action: '建立连接',
        detail: `连接到设备 ${name || targetDeviceId}`,
        severity: 'info',
      },
    });

    const serialized = {
      ...connection,
      connectedAt: connection.connectedAt.toISOString(),
      disconnectedAt: connection.disconnectedAt?.toISOString() || null,
      createdAt: connection.createdAt.toISOString(),
    };

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    console.error('Failed to create connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}
