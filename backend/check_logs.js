const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.logMovimientoMision.findMany({
    take: 10,
    orderBy: { fecha_hora: 'desc' },
    include: { mision: true }
  });
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
