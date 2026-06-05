const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const log = await prisma.logMovimientoMision.create({
      data: {
        id_mision: 1,
        tipo_evento: 'parada_tecnica',
        ubicacion: 'Test',
        kilometraje_registro: 100,
        nivel_combustible: 'F'
      }
    });
    console.log('Success:', log);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
