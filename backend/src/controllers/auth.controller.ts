import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'secret_rnpn_2024'

export const login = async (req: Request, res: Response) => {
  try {
    const { correo, password } = req.body

    const usuario = await prisma.usuario.findUnique({
      where: { correo }
    })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })
    }

    const validPassword = await bcrypt.compare(password, usuario.password_hash)
    if (!validPassword) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as any }
    )

    res.json({
      ok: true,
      data: {
        usuario: {
          id: usuario.id_usuario,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
          id_motorista: usuario.id_motorista
        },
        token
      }
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error en el servidor' })
  }
}

export const getMe = async (req: any, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: req.usuarioId },
      include: {
        motorista: {
          select: { nombre: true, apellido: true }
        }
      }
    })

    if (!usuario) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    }

    res.json({
      ok: true,
      data: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        id_motorista: usuario.id_motorista,
        motorista: usuario.motorista
      }
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error al verificar sesión' })
  }
}
