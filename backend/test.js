const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.usuario.findUnique({where: {id_usuario: 3}});
  console.log(user);
}
main().then(() => prisma.$disconnect());
