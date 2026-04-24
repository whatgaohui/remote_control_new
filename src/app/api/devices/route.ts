import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/devices - List all devices
export async function GET() {
  try {
    const devices = await db.device.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const serialized = devices.map((d) => ({
      ...d,
      lastSeen: d.lastSeen.toISOString(),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

// POST /api/devices - Create a new device
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, host, port, os } = body;

    if (!name || !host || !port) {
      return NextResponse.json(
        { error: 'name, host, and port are required' },
        { status: 400 }
      );
    }

    const device = await db.device.create({
      data: {
        name,
        host,
        port: Number(port),
        os: os || 'windows',
        status: 'offline',
      },
    });

    const serialized = {
      ...device,
      lastSeen: device.lastSeen.toISOString(),
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    console.error('Failed to create device:', error);
    return NextResponse.json(
      { error: 'Failed to create device' },
      { status: 500 }
    );
  }
}
