import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`No encontrado - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode)
  
  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - ${req.ip}`)
  
  res.json({
    ok: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  })
}
