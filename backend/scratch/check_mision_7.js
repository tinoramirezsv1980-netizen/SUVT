const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.logMovimientoMision.findMany({
    where: { id_mision: 7 }
  });
  console.log('Logs for Mision 7:', logs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
