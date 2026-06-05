import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../prisma/client'

// Obtener todos los usuarios
export const getAll = async (_req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    })
    res.json({ ok: true, usuarios })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener usuarios' })
  }
}

// Crear un usuario
export const create = async (req: Request, res: Response) => {
  const { nombre, correo, password, rol, id_motorista } = req.body

  try {
    const existe = await prisma.usuario.findUnique({ where: { correo } })
    if (existe) {
      return res.status(400).json({ ok: false, error: 'El correo ya está registrado' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        password_hash,
        rol,
        id_motorista: (id_motorista && id_motorista !== "") ? parseInt(id_motorista) : null,
        activo: true
      }
    })

    res.status(201).json({ ok: true, usuario: { id: usuario.id_usuario, nombre, correo, rol } })
  } catch (error: any) {
    console.error('Error al crear usuario:', error)
    res.status(500).json({ ok: false, error: error.message || 'Error al crear usuario' })
  }
}

// Actualizar un usuario
export const update = async (req: Request, res: Response) => {
  const { id } = req.params
  const { nombre, rol, activo, id_motorista } = req.body

  try {
    const idNum = parseInt(id)
    
    // Protección: Si se intenta desactivar o cambiar el rol del último administrador
    if (rol !== 'admin' || activo === false) {
      const usuarioActual = await prisma.usuario.findUnique({ where: { id_usuario: idNum } })
      if (usuarioActual?.rol === 'admin') {
        const totalAdmins = await prisma.usuario.count({
          where: { rol: 'admin', activo: true }
        })
        if (totalAdmins <= 1 && (rol !== 'admin' || activo === false)) {
          return res.status(400).json({ 
            ok: false, 
            error: 'No se puede desactivar o cambiar el rol al único administrador activo.' 
          })
        }
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id_usuario: idNum },
      data: { 
        nombre, 
        rol, 
        activo,
        id_motorista: (id_motorista && id_motorista !== "") ? parseInt(id_motorista) : null
      }
    })

    res.json({ ok: true, usuario })
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error)
    res.status(500).json({ ok: false, error: error.message || 'Error al actualizar usuario' })
  }
}

// Resetear contraseña (solo Admin)
export const resetPassword = async (req: Request, res: Response) => {
  const { id } = req.params
  const { nuevaPassword } = req.body

  try {
    const idNum = parseInt(id)
    const password_hash = await bcrypt.hash(nuevaPassword, 10)

    await prisma.usuario.update({
      where: { id_usuario: idNum },
      data: { password_hash }
    })

    res.json({ ok: true, message: 'Contraseña reseteada exitosamente' })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error al resetear contraseña' })
  }
}

// Eliminar usuario
export const remove = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const idNum = parseInt(id)

    // Protección: No borrar el último administrador
    const usuarioABorrar = await prisma.usuario.findUnique({ where: { id_usuario: idNum } })
    if (usuarioABorrar?.rol === 'admin') {
      const totalAdmins = await prisma.usuario.count({
        where: { rol: 'admin', activo: true }
      })
      if (totalAdmins <= 1) {
        return res.status(400).json({ 
          ok: false, 
          error: 'No se puede eliminar al único administrador del sistema.' 
        })
      }
    }

    await prisma.usuario.delete({ where: { id_usuario: idNum } })
    res.json({ ok: true, message: 'Usuario eliminado' })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error al eliminar usuario' })
  }
}
