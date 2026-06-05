import nodemailer from 'nodemailer'
import prisma from '../../prisma/client'
import logger from '../../utils/logger'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Envía un resumen diario de las asignaciones de hoy
 */
export async function enviarResumenDiario(hoy: string): Promise<void> {
  try {
    const misiones = await prisma.mision.findMany({
      where: { fecha_solicitud: { gte: new Date(hoy) } },
      include: {
        motorista: true,
        vehiculo: true,
        unidad: true
      }
    })

    if (misiones.length === 0) {
      logger.info(`No hay misiones para enviar en el resumen: ${hoy}`)
      return
    }

    const html = `
      <h1>Resumen Diario de Misiones - ${hoy}</h1>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th>Motorista</th>
            <th>Vehículo</th>
            <th>Unidad</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          ${misiones.map((m: any) => `
            <tr>
              <td>${m.motorista?.nombre || 'N/A'} ${m.motorista?.apellido || ''}</td>
              <td>${m.vehiculo?.placa || 'N/A'}</td>
              <td>${m.unidad?.nombre_unidad || 'N/A'}</td>
              <td>${m.descripcion_mision}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

    await transporter.sendMail({
      from: `"RNPN Vehículos" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `Resumen de Asignaciones - ${hoy}`,
      html,
    })

    logger.info(`Resumen diario enviado exitosamente`)
  } catch (error) {
    logger.error('Error al enviar resumen diario:', error)
    throw error
  }
}

/**
 * Verifica vehículos que requieren mantenimiento según kilometraje
 */
export async function verificarMantenimiento(): Promise<void> {
  try {
    // Ejemplo: buscar vehículos con más de 5000km o que el estado sea mantenimiento
    const vehiculosAlerta = await prisma.vehiculo.findMany({
      where: {
        OR: [
          { kilometraje_actual: { gte: 5000 } },
          { estado: 'mantenimiento' }
        ]
      }
    })

    if (vehiculosAlerta.length === 0) return

    const html = `
      <h2>Alerta de Mantenimiento de Vehículos</h2>
      <ul>
        ${vehiculosAlerta.map(v => `
          <li>Placa: <strong>${v.placa}</strong> - Modelo: ${v.modelo} - KM: ${v.kilometraje_actual}</li>
        `).join('')}
      </ul>
    `

    await transporter.sendMail({
      from: `"RNPN Vehículos" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `Alerta de Mantenimiento de Vehículos`,
      html,
    })

    logger.info(`Alertas de mantenimiento enviadas: ${vehiculosAlerta.length}`)
  } catch (error) {
    logger.error('Error al verificar mantenimiento:', error)
    throw error
  }
}
