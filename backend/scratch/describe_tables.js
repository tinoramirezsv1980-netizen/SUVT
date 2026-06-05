const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const describeLog = await prisma.$queryRawUnsafe('DESCRIBE log_movimientos_mision');
    console.log('--- DESCRIBE log_movimientos_mision ---');
    console.log(describeLog);

    const createLog = await prisma.$queryRawUnsafe('SHOW CREATE TABLE log_movimientos_mision');
    console.log('\n--- SHOW CREATE TABLE log_movimientos_mision ---');
    console.log(createLog);

    const describeMision = await prisma.$queryRawUnsafe('DESCRIBE mision');
    console.log('\n--- DESCRIBE mision ---');
    console.log(describeMision);
  } catch (error) {
    console.error('Error running raw query:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
