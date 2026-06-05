import { Response, NextFunction } from 'express'

/**
 * Middleware para restringir el acceso a ciertos roles
 */
export const permitirSoloAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.usuarioRol !== 'admin') {
    return res.status(403).json({ 
      ok: false, 
      error: 'Acceso denegado: Se requiere rol de Administrador' 
    })
  }
  next()
}

/**
 * Middleware para bloquear acciones de escritura (POST, PATCH, DELETE) a usuarios Auxiliares
 */
export const bloquearAuxiliar = (req: any, res: Response, next: NextFunction) => {
  if (req.usuarioRol === 'auxiliar') {
    return res.status(403).json({ 
      ok: false, 
      error: 'Acceso denegado: Su cuenta tiene permisos de Solo Lectura' 
    })
  }
  next()
}
