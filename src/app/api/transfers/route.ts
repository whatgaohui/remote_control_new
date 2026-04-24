import { NextResponse } from 'next/server';

// GET /api/transfers - Return mock file transfers
export async function GET() {
  try {
    const mockTransfers = [
      { id: '1', deviceId: '1', fileName: 'project.zip', fileSize: 52428800, direction: 'upload', status: 'completed', progress: 100, speed: '2.5 MB/s', createdAt: new Date(Date.now() - 600000).toISOString(), updatedAt: new Date().toISOString() },
      { id: '2', deviceId: '1', fileName: 'database.sql', fileSize: 104857600, direction: 'download', status: 'transferring', progress: 65, speed: '3.1 MB/s', createdAt: new Date(Date.now() - 300000).toISOString(), updatedAt: new Date().toISOString() },
      { id: '3', deviceId: '1', fileName: 'report.docx', fileSize: 2516582, direction: 'upload', status: 'transferring', progress: 82, speed: '1.8 MB/s', createdAt: new Date(Date.now() - 120000).toISOString(), updatedAt: new Date().toISOString() },
      { id: '4', deviceId: '1', fileName: 'backup.tar.gz', fileSize: 209715200, direction: 'download', status: 'pending', progress: 0, speed: '0 KB/s', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    return NextResponse.json(mockTransfers);
  } catch (error) {
    console.error('Failed to fetch transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}
