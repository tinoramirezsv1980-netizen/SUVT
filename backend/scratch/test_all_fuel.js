const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fuels = ['E', 'un_cuarto', 'un_medio', 'tres_cuartos', 'F'];
  for (const fuel of fuels) {
    try {
      const log = await prisma.logMovimientoMision.create({
        data: {
          id_mision: 1,
          tipo_evento: 'parada_tecnica',
          ubicacion: `Test Fuel: ${fuel}`,
          kilometraje_registro: 100,
          nivel_combustible: fuel
        }
      });
      console.log(`Success for fuel ${fuel}:`, log.id_log);
    } catch (error) {
      console.error(`Error for fuel ${fuel}:`, error);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
