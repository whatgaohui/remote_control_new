import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/devices/[id] - Delete a device
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related operations and connections first
    await db.operation.deleteMany({ where: { deviceId: id } });
    await db.connection.deleteMany({ where: { deviceId: id } });

    const device = await db.device.delete({
      where: { id },
    });

    const serialized = {
      ...device,
      lastSeen: device.lastSeen.toISOString(),
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Failed to delete device:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
