import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secret_rnpn_2024'

export const validarJWT = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token no proporcionado' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    req.usuarioId = payload.id
    req.usuarioRol = payload.rol
    next()
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' })
  }
}
