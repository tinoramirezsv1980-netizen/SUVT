const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const misiones = await prisma.mision.findMany({
    include: {
      movimientos: true,
      controles_acceso: true
    },
    orderBy: { id_mision: 'desc' },
    take: 1
  });
  console.dir(misiones, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
