
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.usuario.findMany({
    include: {
      unidades_a_cargo: true
    }
  });
  console.log('--- USUARIOS ---');
  console.log(JSON.stringify(usuarios, null, 2));
}

main().finally(() => prisma.$disconnect());
