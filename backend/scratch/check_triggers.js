const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const triggers = await prisma.$queryRawUnsafe('SHOW TRIGGERS');
    console.log('--- TRIGGERS ---');
    console.log(triggers);
  } catch (error) {
    console.error('Error fetching triggers:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
