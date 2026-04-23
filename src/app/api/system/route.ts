import { NextResponse } from 'next/server';

// GET /api/system - Return mock system info
export async function GET() {
  try {
    const mockSystemInfo = {
      os: 'Windows 11 Pro',
      osVersion: '10.0.22631',
      hostname: 'DESKTOP-REMOTE01',
      cpu: {
        model: 'Intel Core i7-13700K',
        cores: 16,
        usage: 23,
        perCore: [18, 25, 12, 30, 15, 22, 28, 20, 16, 24, 19, 26, 14, 21, 17, 23],
        temperature: 62,
      },
      memory: {
        total: 34359738368,
        used: 18779942912,
        available: 15579795456,
      },
      disks: [
        { name: 'C:', total: 256000000000, used: 128000000000, available: 128000000000 },
        { name: 'D:', total: 512000000000, used: 256000000000, available: 256000000000 },
        { name: 'E:', total: 1024000000000, used: 512000000000, available: 512000000000 },
      ],
      network: [
        { interface: '以太网', ip: '192.168.1.100', speed: '1 Gbps', sent: 1073741824, received: 5368709120 },
        { interface: 'Wi-Fi', ip: '192.168.1.101', speed: '866 Mbps', sent: 536870912, received: 2147483648 },
      ],
      uptime: 259200,
    };

    return NextResponse.json(mockSystemInfo);
  } catch (error) {
    console.error('Failed to fetch system info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system info' },
      { status: 500 }
    );
  }
}
