const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const misiones = await prisma.mision.findMany({
    include: {
      movimientos: true
    }
  });

  console.log('--- Checking Misiones & Logs ---');
  for (const m of misiones) {
    const hasInitialLog = m.movimientos.some(mov => mov.tipo_evento === 'salida_base');
    const hasFinalLog = m.movimientos.some(mov => mov.tipo_evento === 'finalizacion');

    const issues = [];
    if (m.kilometraje_inicial !== null && !hasInitialLog) {
      issues.push(`Has kilometraje_inicial (${m.kilometraje_inicial}) but NO salida_base log`);
    }
    if (m.kilometraje_final !== null && !hasFinalLog) {
      issues.push(`Has kilometraje_final (${m.kilometraje_final}) but NO finalizacion log`);
    }

    if (issues.length > 0) {
      console.log(`Mision ID ${m.id_mision} (Estado: ${m.estado_mision}):`);
      issues.forEach(iss => console.log(`  - ${iss}`));
      console.log('  - All Log events found:', m.movimientos.map(mov => mov.tipo_evento).join(', '));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
