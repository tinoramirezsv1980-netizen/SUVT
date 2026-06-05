const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const log = await prisma.logMovimientoMision.create({
      data: {
        id_mision: 1,
        tipo_evento: 'parada_tecnica',
        ubicacion: 'Test Raw Fuel',
        kilometraje_registro: 100,
        nivel_combustible: '1/2' // Passing DB mapped value instead of 'un_medio'
      }
    });
    console.log('Success with raw 1/2:', log);
  } catch (error) {
    console.error('Error with raw 1/2:', error.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
