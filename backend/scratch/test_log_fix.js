const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

const MISION_ID = 7;

async function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, res => {
      let result = '';
      res.on('data', chunk => result += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(result) });
        } catch (e) {
          resolve({ status: res.statusCode, data: result });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test() {
  try {
    console.log('1. Limpiando datos previos de la misión para pruebas limpia...');
    await prisma.logMovimientoMision.deleteMany({
      where: { id_mision: MISION_ID }
    });
    await prisma.mision.update({
      where: { id_mision: MISION_ID },
      data: {
        estado_mision: 'aprobada',
        kilometraje_inicial: null,
        kilometraje_final: null
      }
    });
    console.log('Misión reseteada.');

    console.log('\n2. Probando Salida Base con combustible "F"...');
    let res = await request('/misiones/movement', 'POST', {
      id_mision: MISION_ID,
      tipo_evento: 'salida_base',
      ubicacion: 'Base Central RNPN',
      kilometraje_registro: 1550,
      nivel_combustible: 'F'
    });
    console.log('Respuesta Salida Base:', res);

    console.log('\n3. Probando Parada Técnica con combustible raw "1/2"...');
    res = await request('/misiones/movement', 'POST', {
      id_mision: MISION_ID,
      tipo_evento: 'parada_tecnica',
      ubicacion: 'Gasolinera Puma',
      kilometraje_registro: 1575,
      nivel_combustible: '1/2' // Raw representation
    });
    console.log('Respuesta Parada Técnica:', res);

    console.log('\n4. Probando Finalizar Misión con combustible raw "3/4"...');
    res = await request(`/misiones/${MISION_ID}/finalize`, 'PATCH', {
      kilometraje_final: 1620,
      nivel_combustible: '3/4' // Raw representation
    });
    console.log('Respuesta Finalizar:', res);

    console.log('\n5. Verificando resultados finales en la base de datos...');
    const misionDb = await prisma.mision.findUnique({
      where: { id_mision: MISION_ID },
      include: { movimientos: true }
    });

    console.log(`Estado Final Misión: ${misionDb.estado_mision}`);
    console.log(`Kilometraje Inicial Misión: ${misionDb.kilometraje_inicial}`);
    console.log(`Kilometraje Final Misión: ${misionDb.kilometraje_final}`);
    console.log('\nMovimientos registrados en log_movimientos_mision:');
    console.table(misionDb.movimientos.map(m => ({
      id_log: m.id_log,
      tipo_evento: m.tipo_evento,
      ubicacion: m.ubicacion,
      kilometraje_registro: m.kilometraje_registro,
      nivel_combustible: m.nivel_combustible
    })));

  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
