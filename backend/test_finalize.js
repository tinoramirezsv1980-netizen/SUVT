const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const misionId = 1;
  const kilometraje_final = 200;
  const nivel_combustible = 'F';

  try {
    // Simulando lo que hace el controlador finalize
    const km = (kilometraje_final !== undefined && kilometraje_final !== null && kilometraje_final !== '') ? parseInt(kilometraje_final) : null;
    
    await prisma.mision.update({
      where: { id_mision: misionId },
      data: { 
        estado_mision: 'finalizada',
        kilometraje_final: (km !== null && !isNaN(km)) ? km : null
      }
    });

    await prisma.logMovimientoMision.create({
      data: {
        id_mision: misionId,
        tipo_evento: 'finalizacion',
        ubicacion: 'Base (Cierre de misión) - TEST',
        kilometraje_registro: (km !== null && !isNaN(km)) ? km : null,
        nivel_combustible: nivel_combustible || null
      }
    });
    console.log('Success');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
