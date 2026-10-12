import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import logger from '../utils/logger'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`No encontrado - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Errores de multer: código HTTP correcto y mensaje en español
  if (err instanceof multer.MulterError) {
    const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 5)
    const mapa: Record<string, [number, string]> = {
      LIMIT_FILE_SIZE:       [413, `El archivo excede el máximo permitido de ${maxMb} MB`],
      LIMIT_UNEXPECTED_FILE: [400, 'Campo de archivo inesperado'],
      LIMIT_FILE_COUNT:      [400, 'Se recibieron demasiados archivos'],
    }

    const [code, msg] = mapa[err.code] ?? [400, 'Error al procesar el archivo']
    logger.error(`${err.code} - ${req.method} ${req.originalUrl} - ${req.ip}`)
    return res.status(code).json({ ok: false, error: msg })
  }

  if (err?.message === 'Formato de archivo no permitido') {
    return res.status(400).json({ ok: false, error: err.message })
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode)

  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - ${req.ip}`)

  res.json({
    ok: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  })
}
