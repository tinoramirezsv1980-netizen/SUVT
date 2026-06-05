const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const misiones = await prisma.mision.findMany({
    take: 5,
    orderBy: { id_mision: 'desc' },
    select: {
      id_mision: true,
      kilometraje_inicial: true,
      kilometraje_final: true,
      estado_mision: true
    }
  });
  console.log('Ultimas 5 misiones:');
  console.table(misiones);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
