
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const unidades = await prisma.unidadOrganizativa.findMany();
  console.log('--- UNIDADES ---');
  console.log(JSON.stringify(unidades, null, 2));
}

main().finally(() => prisma.$disconnect());
