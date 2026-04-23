import { NextResponse } from 'next/server';

// Mock file data for different paths
const mockFilesByPath: Record<string, Array<{
  name: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  path: string;
}>> = {
  default: [
    { name: '桌面', type: 'folder', size: 0, modified: '2024-12-15 10:30', path: 'C:\\Users\\Admin\\桌面' },
    { name: '文档', type: 'folder', size: 0, modified: '2024-12-14 16:20', path: 'C:\\Users\\Admin\\文档' },
    { name: '下载', type: 'folder', size: 0, modified: '2024-12-15 08:45', path: 'C:\\Users\\Admin\\下载' },
    { name: '图片', type: 'folder', size: 0, modified: '2024-12-13 14:10', path: 'C:\\Users\\Admin\\图片' },
    { name: '音乐', type: 'folder', size: 0, modified: '2024-12-10 09:00', path: 'C:\\Users\\Admin\\音乐' },
    { name: '视频', type: 'folder', size: 0, modified: '2024-12-08 12:30', path: 'C:\\Users\\Admin\\视频' },
    { name: 'readme.txt', type: 'file', size: 2048, modified: '2024-12-15 09:15', path: 'C:\\Users\\Admin\\readme.txt' },
    { name: 'config.json', type: 'file', size: 512, modified: '2024-12-14 17:00', path: 'C:\\Users\\Admin\\config.json' },
    { name: 'app.exe', type: 'file', size: 15728640, modified: '2024-12-12 11:30', path: 'C:\\Users\\Admin\\app.exe' },
    { name: 'data.xlsx', type: 'file', size: 327680, modified: '2024-12-11 15:45', path: 'C:\\Users\\Admin\\data.xlsx' },
  ],
  desktop: [
    { name: '项目计划.docx', type: 'file', size: 1048576, modified: '2024-12-15 10:00', path: 'C:\\Users\\Admin\\桌面\\项目计划.docx' },
    { name: '会议纪要.pdf', type: 'file', size: 524288, modified: '2024-12-14 15:30', path: 'C:\\Users\\Admin\\桌面\\会议纪要.pdf' },
    { name: '快捷方式', type: 'folder', size: 0, modified: '2024-12-13 09:00', path: 'C:\\Users\\Admin\\桌面\\快捷方式' },
    { name: '临时文件', type: 'folder', size: 0, modified: '2024-12-15 08:00', path: 'C:\\Users\\Admin\\桌面\\临时文件' },
  ],
  documents: [
    { name: '工作报告', type: 'folder', size: 0, modified: '2024-12-14 16:00', path: 'C:\\Users\\Admin\\文档\\工作报告' },
    { name: '学习资料', type: 'folder', size: 0, modified: '2024-12-13 11:00', path: 'C:\\Users\\Admin\\文档\\学习资料' },
    { name: '合同模板.docx', type: 'file', size: 2097152, modified: '2024-12-12 14:30', path: 'C:\\Users\\Admin\\文档\\合同模板.docx' },
    { name: '财务报表.xlsx', type: 'file', size: 8388608, modified: '2024-12-11 09:20', path: 'C:\\Users\\Admin\\文档\\财务报表.xlsx' },
  ],
};

// GET /api/files - Return mock file list based on path query param
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || 'C:\\Users\\Admin';

    // Determine which mock data to return based on path
    let files = mockFilesByPath.default;

    if (path.includes('桌面') || path.toLowerCase().includes('desktop')) {
      files = mockFilesByPath.desktop;
    } else if (path.includes('文档') || path.toLowerCase().includes('documents')) {
      files = mockFilesByPath.documents;
    }

    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
