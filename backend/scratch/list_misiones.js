const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const misiones = await prisma.mision.findMany({
    include: {
      movimientos: true
    }
  });

  console.log('--- List of Misiones ---');
  for (const m of misiones) {
    console.log(`Mision ID ${m.id_mision}: State=${m.estado_mision}, KmIni=${m.kilometraje_inicial}, KmFin=${m.kilometraje_final}, LogsCount=${m.movimientos.length}`);
    if (m.movimientos.length > 0) {
      console.log('  Logs:', m.movimientos.map(mov => `${mov.tipo_evento} (${mov.kilometraje_registro} km, Fuel: ${mov.nivel_combustible})`).join(' | '));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
