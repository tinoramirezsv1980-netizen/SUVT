const http = require('http');

async function test() {
  const req = (path, method, body) => new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    const request = http.request(options, res => {
      let result = '';
      res.on('data', chunk => result += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(result) }));
    });
    request.on('error', reject);
    request.write(data);
    request.end();
  });

  try {
    console.log('--- Iniciando mision 7 ---');
    let res = await req('/misiones/movement', 'POST', {
      id_mision: 7,
      tipo_evento: 'salida_base',
      ubicacion: 'Base RNPN',
      kilometraje_registro: 1500,
      nivel_combustible: 'F'
    });
    console.log('Salida Base:', res);

    console.log('--- Finalizando mision 7 ---');
    res = await req('/misiones/7/finalize', 'PATCH', {
      kilometraje_final: 1600,
      nivel_combustible: 'tres_cuartos'
    });
    console.log('Finalizacion:', res);
  } catch (err) {
    console.error(err);
  }
}
test();
