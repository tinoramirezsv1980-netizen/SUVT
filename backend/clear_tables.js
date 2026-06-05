const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE control_acceso_seguridad;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE log_movimientos_mision;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE mision;');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('Tablas control_acceso_seguridad, log_movimientos_mision y mision han sido vaciadas a cero.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
