import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const correo = 'jose.ramirez@rnpn.gob.sv'
  const password = 'CeLb2027$10aww'

  console.log(`Verificando usuario: ${correo}...`)
  
  const usuario = await prisma.usuario.findUnique({
    where: { correo }
  })

  if (!usuario) {
    console.log('Error: El usuario no existe en la base de datos.')
    
    // Listar todos los usuarios para ver qué hay
    const todos = await prisma.usuario.findMany({ select: { id_usuario: true, correo: true } })
    console.log('Usuarios registrados actualmente:', todos)
    return
  }

  console.log('Usuario encontrado:', {
    id: usuario.id_usuario,
    correo: usuario.correo,
    activo: usuario.activo,
    rol: usuario.rol
  })

  const esValido = await bcrypt.compare(password, usuario.password_hash)
  console.log('¿Contraseña válida con bcrypt?', esValido ? 'SÍ' : 'NO')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
