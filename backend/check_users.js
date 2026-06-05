const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany();
  console.table(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
