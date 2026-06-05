import cron from 'node-cron'
import logger from '../utils/logger'
import { enviarResumenDiario, verificarMantenimiento } from '../services/notifications/email.service'

export function iniciarCrons(): void {

  // Resumen diario — lunes a viernes a las 6:00 AM
  cron.schedule('0 6 * * 1-5', async () => {
    const hoy = new Date().toISOString().split('T')[0]
    logger.info(`[CRON] Enviando resumen diario: ${hoy}`)
    await enviarResumenDiario(hoy).catch((e: any) =>
      logger.error('[CRON] Error resumen diario:', e))
  }, { timezone: 'America/El_Salvador' })

  // Verificar mantenimiento — lunes a las 7:00 AM
  cron.schedule('0 7 * * 1', async () => {
    logger.info('[CRON] Verificando vehículos próximos a mantenimiento...')
    await verificarMantenimiento().catch((e: any) =>
      logger.error('[CRON] Error mantenimiento:', e))
  }, { timezone: 'America/El_Salvador' })

  logger.info('Tareas programadas (cron) iniciadas — zona horaria: America/El_Salvador')
}
