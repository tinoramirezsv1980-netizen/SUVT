
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('RNPN2026', 12);

  console.log('Creando Unidad Organizativa de prueba...');
  const unidad = await prisma.unidadOrganizativa.upsert({
    where: { id_unitat: 1 },
    update: {},
    create: {
      id_unitat: 1,
      nombre_unidad: 'Unidad de Servicios Generales'
    }
  });

  console.log('Creando usuario Jefatura...');
  await prisma.usuario.upsert({
    where: { correo: 'jefatura@rnpn.gob.sv' },
    update: {},
    create: {
      nombre: 'Jefe de Servicios Generales',
      correo: 'jefatura@rnpn.gob.sv',
      password_hash: passwordHash,
      rol: 'jefatura',
      activo: true
    }
  });

  console.log('Creando usuario Seguridad...');
  await prisma.usuario.upsert({
    where: { correo: 'seguridad@rnpn.gob.sv' },
    update: {},
    create: {
      nombre: 'Oficial de Seguridad Base',
      correo: 'seguridad@rnpn.gob.sv',
      password_hash: passwordHash,
      rol: 'seguridad',
      activo: true
    }
  });

  console.log('Creando Motorista y su usuario...');
  const motorista = await prisma.motorista.create({
    data: {
      nombre: 'Juan',
      apellido: 'Perez',
      codigo_empleado: 'MOT-001',
      numero_licencia: '1234-567890-101-1',
      categoria_licencia: 'PESADA',
      estado: 'activo'
    }
  });

  await prisma.usuario.upsert({
    where: { correo: 'motorista@rnpn.gob.sv' },
    update: {},
    create: {
      nombre: 'Juan Perez (Motorista)',
      correo: 'motorista@rnpn.gob.sv',
      password_hash: passwordHash,
      rol: 'auxiliar', // El motorista usa el panel via su id_motorista, el rol puede ser auxiliar
      id_motorista: motorista.id_motorista,
      activo: true
    }
  });

  console.log('Seeding completado con éxito.');
  console.log('Contraseña para todos: RNPN2026');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
