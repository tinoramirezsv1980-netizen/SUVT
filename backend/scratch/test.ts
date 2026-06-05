import prisma from '../src/prisma/client';

async function main() {
  try {
    const res = await prisma.logMovimientoMision.create({
      data: {
        id_mision: 1, // asumiendo que existe la mision 1
        tipo_evento: 'salida_base',
        ubicacion: 'Test',
        kilometraje_registro: 10,
        nivel_combustible: 'F'
      }
    });
    console.log("Log created:", res);
  } catch(e) {
    console.error("Log error:", e);
  }

  try {
    const res2 = await prisma.controlAccesoSeguridad.create({
      data: {
        id_mision: 1,
        id_usuario_seguridad: 1, // asumiendo que existe
        tipo_movimiento: 'salida_base',
        observaciones: 'test'
      }
    });
    console.log("Control created:", res2);
  } catch(e) {
    console.error("Control error:", e);
  }

  await prisma.$disconnect();
}

main();
