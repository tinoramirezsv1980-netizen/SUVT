import { Request, Response } from 'express'
import prisma from '../prisma/client'

const mapFuelLevel = (fuel: any): any => {
  if (!fuel) return null
  const clean = fuel.toString().trim()
  switch (clean) {
    case '1/4':
    case 'un_cuarto':
      return 'un_cuarto'
    case '1/2':
    case 'un_medio':
      return 'un_medio'
    case '3/4':
    case 'tres_cuartos':
      return 'tres_cuartos'
    case 'E':
    case 'e':
      return 'E'
    case 'F':
    case 'f':
      return 'F'
    default:
      return clean
  }
}

const mapTipoEvento = (evento: any): any => {
  if (!evento) return null
  const clean = evento.toString().trim()
  switch (clean) {
    case 'salida_base':
    case 'salidaBase':
      return 'salida_base'
    case 'llegada_destino':
    case 'llegadaDestino':
      return 'llegada_destino'
    case 'salida_destino':
    case 'salidaDestino':
      return 'salida_destino'
    case 'parada_tecnica':
    case 'paradaTecnica':
      return 'parada_tecnica'
    case 'incidente':
      return 'incidente'
    case 'retorno_base':
    case 'retornoBase':
      return 'retorno_base'
    case 'finalizacion':
    case 'finalización':
    case 'finalize':
      return 'finalizacion'
    default:
      return clean
  }
}

// 1. Solicitud de Misión - Jefatura inicia el proceso
export const create = async (req: Request, res: Response) => {
  try {
    const { id_usuario_solicitante, id_unidad, objetivo_mision, persona_mision, destino, fecha_mision, hora_mision, descripcion_mision } = req.body
    const mision = await prisma.mision.create({
      data: {
        id_usuario_solicitante: parseInt(id_usuario_solicitante),
        id_unidad: parseInt(id_unidad),
        objetivo_mision,
        persona_mision,
        destino,
        fecha_mision: fecha_mision ? new Date(fecha_mision) : null,
        hora_mision,
        descripcion_mision: descripcion_mision || '',
        estado_mision: 'solicitada'
      }
    })
    res.status(201).json({ ok: true, mision })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

// 2. Verificación y Asignación - Admin valida y asigna recursos
export const assign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { id_vehiculo, id_motorista, estado_mision, justificacion_cambio_vehiculo } = req.body // estado_mision puede ser 'aprobada' o 'rechazada'
    
    const mision = await prisma.mision.update({
      where: { id_mision: parseInt(id) },
      data: {
        id_vehiculo: id_vehiculo ? parseInt(id_vehiculo) : undefined,
        id_motorista: id_motorista ? parseInt(id_motorista) : undefined,
        estado_mision: estado_mision || 'aprobada',
        justificacion_cambio_vehiculo: justificacion_cambio_vehiculo || null
      }
    })
    res.json({ ok: true, mision })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

// 3. Control de Salida - Seguridad registra salida de base
// 7. Control de Entrada - Seguridad registra llegada a base
export const registerAccess = async (req: Request, res: Response) => {
  try {
    const { id_mision, id_usuario_seguridad, tipo_movimiento, observaciones } = req.body
    
    console.log(`[Access] Mision: ${id_mision}, Tipo: ${tipo_movimiento}`);

    const control = await prisma.controlAccesoSeguridad.create({
      data: {
        id_mision: parseInt(id_mision),
        id_usuario_seguridad: parseInt(id_usuario_seguridad),
        tipo_movimiento,
        observaciones: observaciones || null
      }
    })

    // Si es salida, forzar estado a 'en_curso'
    if (tipo_movimiento === 'salida_base') {
      await prisma.mision.update({
        where: { id_mision: parseInt(id_mision) },
        data: { estado_mision: 'en_curso' }
      })
    }

    res.status(201).json({ ok: true, control })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

// 4. Registro de Llegada / 5. Movimientos / 6. Registro de Retorno
export const addMovement = async (req: Request, res: Response) => {
  try {
    const { id_mision, tipo_evento, ubicacion, kilometraje_registro, nivel_combustible } = req.body
    const misionId = parseInt(id_mision)
    
    // Asegurar que kilometraje_registro sea un número válido o null
    let km = null;
    if (kilometraje_registro !== undefined && kilometraje_registro !== null && kilometraje_registro !== '') {
      km = parseInt(kilometraje_registro.toString());
      if (isNaN(km)) km = null;
    }

    const cleanFuel = mapFuelLevel(nivel_combustible);
    const cleanEvento = mapTipoEvento(tipo_evento);

    // Validación explícita para evitar que Prisma falle por enums inválidos / nulos
    if (!cleanEvento) {
      return res.status(400).json({
        ok: false,
        error: `tipo_evento inválido (recibido: ${tipo_evento})`
      })
    }

    console.log(`[Movement] Mision: ${misionId}, Evento: ${cleanEvento}, KM: ${km}, Fuel: ${cleanFuel}`);

    // Registrar el movimiento y actualizar misión en una transacción atómica
    const log = await prisma.$transaction(async (tx) => {
      // 1. Si es salida de base, actualizar kilometraje_inicial en la tabla Mision
      if (cleanEvento === 'salida_base' && km !== null) {
        await tx.mision.update({
          where: { id_mision: misionId },
          data: { kilometraje_inicial: km }
        })
        console.log(`[Movement] Kilometraje inicial actualizado en tabla Mision: ${km}`)
      }

      // 2. Registrar el movimiento en el log (siempre se guarda)
      return await tx.logMovimientoMision.create({
        data: {
          id_mision: misionId,
          tipo_evento: cleanEvento,
          ubicacion: ubicacion || 'Ubicación no especificada',
          kilometraje_registro: km,
          nivel_combustible: cleanFuel
        }
      })
    })

    res.status(201).json({ ok: true, log })
  } catch (error: any) {
    // Mantener el error original para que no quede silencioso
    console.error('[Movement Error]', error);
    res.status(400).json({ ok: false, error: error.message })
  }

  /* eliminado bloque anidado incorrecto catch txError */
}

// 8. Finalización - Motorista cierra la misión
export const finalize = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { kilometraje_final, nivel_combustible } = req.body
    const misionId = parseInt(id)
    
    let km = null;
    if (kilometraje_final !== undefined && kilometraje_final !== null && kilometraje_final !== '') {
      km = parseInt(kilometraje_final.toString());
      if (isNaN(km)) km = null;
    }

    const cleanFuel = mapFuelLevel(nivel_combustible);

    console.log(`[Finalize] Mision: ${misionId}, KM Final: ${km}, Fuel: ${cleanFuel}`);

    // Ejecutar todo el cierre en una transacción atómica
    await prisma.$transaction(async (tx) => {
      // 1. Obtener la misión para saber qué vehículo actualizar
      const misionActual = await tx.mision.findUnique({
        where: { id_mision: misionId },
        select: { id_vehiculo: true }
      });

      // 2. Consolidar datos desde log_movimientos_mision y control_acceso_seguridad
      const logSalida = await tx.logMovimientoMision.findFirst({
        where: { id_mision: misionId, tipo_evento: 'salida_base' },
        orderBy: { fecha_hora: 'desc' }
      });

      const ultimoControl = await tx.controlAccesoSeguridad.findFirst({
        where: { id_mision: misionId },
        orderBy: { fecha_hora: 'desc' }
      });

      // 3. Actualizar tabla maestra Mision con datos consolidados
      await tx.mision.update({
        where: { id_mision: misionId },
        data: { 
          estado_mision: 'finalizada',
          kilometraje_final: km,
          kilometraje_inicial: logSalida?.kilometraje_registro ?? undefined,
          observaciones_mision: ultimoControl?.observaciones ?? undefined
        }
      })

      // 4. Actualizar kilometraje actual del vehículo
      if (misionActual?.id_vehiculo && km !== null && !isNaN(km)) {
        await tx.vehiculo.update({
          where: { id_vehiculo: misionActual.id_vehiculo },
          data: { kilometraje_actual: km }
        });
        console.log(`[Finalize] Kilometraje del vehículo ${misionActual.id_vehiculo} actualizado a ${km}`);
      }
      
      // 5. Registrar el evento de finalización en log para trazabilidad
      await tx.logMovimientoMision.create({
        data: {
          id_mision: misionId,
          tipo_evento: 'finalizacion',
          ubicacion: 'Base (Cierre de misión)',
          kilometraje_registro: km,
          nivel_combustible: cleanFuel
        }
      })
    })

    res.json({ ok: true })
  } catch (error: any) {
    console.error('[Finalize Error]', error);
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const getAll = async (_req: Request, res: Response) => {
  try {
    const misiones = await prisma.mision.findMany({
      include: {
        solicitante: true,
        unidad: true,
        vehiculo: true,
        motorista: true,
        movimientos: true,
        controles_acceso: true
      },
      orderBy: { fecha_solicitud: 'desc' }
    })
    res.json({ ok: true, misiones })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

// Subir documento de respaldo (PDF/Imagen)
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No se recibió ningún archivo' })
    }

    const mision = await prisma.mision.update({
      where: { id_mision: parseInt(id) },
      data: { documento_respaldo: req.file.path }
    })

    res.json({ ok: true, mision })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}
