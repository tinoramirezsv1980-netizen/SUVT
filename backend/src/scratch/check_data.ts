
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany();
  const motoristas = await prisma.motorista.findMany();
  
  console.log('--- USUARIOS ---');
  console.log(JSON.stringify(users, null, 2));
  
  console.log('--- MOTORISTAS ---');
  console.log(JSON.stringify(motoristas, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
