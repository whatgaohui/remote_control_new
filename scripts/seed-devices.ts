import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const devices = await prisma.device.findMany();
  const onlineNames = ['办公室电脑', '测试服务器', 'MacBook Pro', '开发服务器', '监控主机'];
  for (const d of devices) {
    const status = onlineNames.includes(d.name) ? 'online' : 'offline';
    await prisma.device.update({ where: { id: d.id }, data: { status, lastSeen: new Date() } });
  }
  const updated = await prisma.device.findMany({ orderBy: { name: 'asc' } });
  updated.forEach(d => console.log(d.name, d.status));
  await prisma.$disconnect();
}
main();
