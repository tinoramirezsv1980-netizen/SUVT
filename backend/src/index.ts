import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import routes from './routes'
import { errorHandler, notFound } from './middlewares'
import logger from './utils/logger'
import prisma from './prisma/client'
import { iniciarCrons } from './jobs/cron'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '4000')

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}))
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  message:  { ok: false, error: 'Demasiadas solicitudes. Intente en 15 minutos.' },
}))

// ── Parsers ────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(compression())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Static Files ──────────────────────────────────────────
app.use('/uploads', express.static('uploads'))

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    ok:     true,
    status: 'running',
    ts:     new Date().toISOString(),
    env:    process.env.NODE_ENV,
    db:     'mysql/xampp',
  })
})

// ── API ────────────────────────────────────────────────────
app.use('/api', routes)

// ── Errores ────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Inicio ─────────────────────────────────────────────────
async function main() {
  try {
    await prisma.$connect()
    logger.info('Conexión a MySQL (XAMPP) establecida')

    iniciarCrons()

    app.listen(PORT, () => {
      logger.info(`API RNPN → http://localhost:${PORT}`)
      logger.info(`Frontend → http://localhost:5173`)
      logger.info(`phpMyAdmin → http://localhost/phpmyadmin`)
      logger.info(`Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
    })
  } catch (err) {
    logger.error('Error al iniciar el servidor:', err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info('Apagando servidor...')
  await prisma.$disconnect()
  process.exit(0)
})

main()
