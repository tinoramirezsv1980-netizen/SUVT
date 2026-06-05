import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const nombre = 'Jose Ramirez'
  const correo = 'jose.ramirez@rnpn.gob.sv'
  const password = 'CeLb2027$10aww'
  const rol = 'admin'

  console.log(`Creando usuario: ${correo}...`)
  
  const password_hash = await bcrypt.hash(password, 10)

  try {
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        password_hash,
        rol: rol as any,
        activo: true
      }
    })
    console.log('Usuario creado exitosamente:', nuevoUsuario)
  } catch (error) {
    console.error('Error al crear el usuario:', error)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
