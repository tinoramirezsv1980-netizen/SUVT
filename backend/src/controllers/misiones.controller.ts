import { Request, Response } from 'express'
import prisma from '../prisma/client'
import cloudinaryService from '../services/cloudinary.service'
import { extractPublicId } from '../utils/cloudinary'
import logger from '../utils/logger'
import {
  notificarNuevaSolicitud,
  notificarMisionAsignada
} from '../services/notifications/email.service'

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

const parseId = (value: any): number | null => {
  const n = parseInt(value?.toString())
  return isNaN(n) ? null : n
}

// 1. Solicitud de Misión - Jefatura inicia el proceso (multi-destino + emergencia)
export const create = async (req: Request, res: Response) => {
  try {
    const {
      id_usuario_solicitante,
      id_unidad,
      objetivo_mision,
      persona_mision,
      destino,
      fecha_mision,
      hora_mision,
      descripcion_mision,
      destinos,
      es_emergencia
    } = req.body

    const solicitanteId = parseId(id_usuario_solicitante)
    const usuarioId = parseId((req as any).usuarioId)

    if (!solicitanteId) {
      return res.status(400).json({ ok: false, error: 'id_usuario_solicitante es obligatorio' })
    }

    // Anti-suplantación: solo se puede solicitar a nombre propio
    if (usuarioId && solicitanteId !== usuarioId) {
      return res.status(403).json({
        ok: false,
        error: 'No puede crear una misión a nombre de otro usuario'
      })
    }

    // Normalizar destinos: acepta destinos[] o un destino de texto suelto
    const crudos: any[] = Array.isArray(destinos) && destinos.length
      ? destinos
      : (destino ? [{ nombre_destino: destino }] : [])

    const normalizados = crudos
      .map((d: any, i: number) => {
        const nombre = (typeof d === 'string' ? d : d?.nombre_destino)?.toString().trim()
        const idArea = typeof d === 'object' && d !== null ? parseId(d.id_area_destino) : null
        return {
          nombre_destino: nombre || '',
          id_area_destino: idArea,
          orden_visita: i + 1
        }
      })
      .filter(d => d.nombre_destino)

    if (normalizados.length === 0) {
      return res.status(400).json({ ok: false, error: 'Debe indicar al menos un destino' })
    }

    // Unidad: si el solicitante es motorista y no envió unidad, se usa la unidad base
    let unidadId = parseId(id_unidad)
    if (!unidadId) {
      const solicitante = await prisma.usuario.findUnique({
        where: { id_usuario: solicitanteId },
        select: { id_motorista: true }
      })
      if (solicitante?.id_motorista) {
        const base = await prisma.unidadOrganizativa.findFirst({
          where: { nombre_unidad: 'Base/Parqueo de Vehículos' },
          select: { id_unitat: true }
        })
        if (base) unidadId = base.id_unitat
      }
    }

    if (!unidadId) {
      return res.status(400).json({ ok: false, error: 'id_unidad es obligatorio' })
    }

    // Misión + destinos en una sola operación atómica (nested write)
    const mision = await prisma.mision.create({
      data: {
        id_usuario_solicitante: solicitanteId,
        id_unidad: unidadId,
        objetivo_mision,
        persona_mision,
        // Compatibilidad: mision.destino = nombre del primer destino
        destino: normalizados[0].nombre_destino,
        fecha_mision: fecha_mision ? new Date(fecha_mision) : null,
        hora_mision,
        descripcion_mision: descripcion_mision || '',
        es_emergencia: es_emergencia === true || es_emergencia === 'true',
        estado_mision: 'solicitada',
        destinos: { create: normalizados }
      },
      include: {
        destinos: { orderBy: { orden_visita: 'asc' }, include: { area_destino: true } }
      }
    })

    // Notificación a administración: no bloqueante
    notificarNuevaSolicitud(mision).catch(err =>
      logger.warn(`No se pudo notificar la nueva solicitud: ${err.message}`)
    )

    res.status(201).json({ ok: true, mision })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

// 2. Verificación y Asignación - Admin valida y asigna recursos
export const assign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      id_vehiculo,
      id_motorista,
      estado_mision,
      justificacion_cambio_vehiculo
    } = req.body // estado_mision puede ser 'aprobada' o 'rechazada'

    const misionId = parseInt(id)

    // La máquina de estados deja de ser decorativa: solo se asignan misiones
    // que siguen en 'solicitada' o 'aprobada'.
    const resultado = await prisma.mision.updateMany({
      where: { id_mision: misionId, estado_mision: { in: ['solicitada', 'aprobada'] } },
      data: {
        id_vehiculo: id_vehiculo ? parseInt(id_vehiculo) : undefined,
        id_motorista: id_motorista ? parseInt(id_motorista) : undefined,
        estado_mision: estado_mision || 'aprobada',
        justificacion_cambio_vehiculo: justificacion_cambio_vehiculo || null
      }
    })

    if (resultado.count === 0) {
      return res.status(400).json({
        ok: false,
        error: 'La misión no existe o ya no admite asignación (estado inválido)'
      })
    }

    const mision = await prisma.mision.findUnique({
      where: { id_mision: misionId },
      include: {
        destinos: { orderBy: { orden_visita: 'asc' }, include: { area_destino: true } },
        motorista: { include: { usuario: true } }
      }
    })

    if (mision && mision.estado_mision === 'aprobada') {
      notificarMisionAsignada(mision).catch(err =>
        logger.warn(`No se pudo notificar la asignación: ${err.message}`)
      )
    }

    res.json({ ok: true, mision })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

// 3. Control de Salida - Seguridad registra salida de base
// 7. Control de Entrada - Seguridad registra llegada a base
export const registerAccess = async (req: Request, res: Response) => {
  try {
    const {
      id_mision,
      id_usuario_seguridad,
      tipo_movimiento,
      observaciones
    } = req.body

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
    const {
      id_mision,
      id_destino_mision,
      tipo_evento,
      ubicacion,
      kilometraje_registro,
      nivel_combustible
    } = req.body

    const misionId = parseInt(id_mision)

    // Asegurar que kilometraje_registro sea un número válido o null
    let km = null;

    if (
      kilometraje_registro !== undefined &&
      kilometraje_registro !== null &&
      kilometraje_registro !== ''
    ) {
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

    // Validar que el destino, si viene, pertenece a esta misión
    let destinoId = parseId(id_destino_mision)
    if (destinoId) {
      const destino = await prisma.destinoMision.findFirst({
        where: { id_destino_mision: destinoId, id_mision: misionId },
        select: { id_destino_mision: true }
      })
      if (!destino) {
        return res.status(400).json({
          ok: false,
          error: 'El destino indicado no pertenece a la misión'
        })
      }
    } else {
      destinoId = null
    }

    console.log(
      `[Movement] Mision: ${misionId}, Destino: ${destinoId}, Evento: ${cleanEvento}, KM: ${km}, Fuel: ${cleanFuel}`
    );

    // Registrar el movimiento y actualizar misión en una transacción atómica
    const log = await prisma.$transaction(async (tx) => {

      // 1. Si es salida de base, actualizar kilometraje_inicial en la tabla Mision
      if (cleanEvento === 'salida_base' && km !== null) {
        await tx.mision.update({
          where: { id_mision: misionId },
          data: { kilometraje_inicial: km }
        })

        console.log(
          `[Movement] Kilometraje inicial actualizado en tabla Mision: ${km}`
        )
      }

      // 2. Registrar el movimiento en el log (siempre se guarda)
      return await tx.logMovimientoMision.create({
        data: {
          id_mision: misionId,
          id_destino_mision: destinoId,
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

    res.status(400).json({
      ok: false,
      error: error.message
    })
  }
}

// 8. Finalización - Motorista cierra la misión
export const finalize = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { kilometraje_final, nivel_combustible } = req.body
    const misionId = parseInt(id)

    let km = null;

    if (
      kilometraje_final !== undefined &&
      kilometraje_final !== null &&
      kilometraje_final !== ''
    ) {
      km = parseInt(kilometraje_final.toString());
      if (isNaN(km)) km = null;
    }

    const cleanFuel = mapFuelLevel(nivel_combustible);

    console.log(
      `[Finalize] Mision: ${misionId}, KM Final: ${km}, Fuel: ${cleanFuel}`
    );

    // Ejecutar todo el cierre en una transacción atómica
    await prisma.$transaction(async (tx) => {

      // 0. Gate de cierre: el destino de mayor orden_visita debe tener su salida
      const ultimoDestino = await tx.destinoMision.findFirst({
        where: { id_mision: misionId },
        orderBy: { orden_visita: 'desc' }
      })

      if (ultimoDestino) {
        const salida = await tx.logMovimientoMision.findFirst({
          where: {
            id_mision: misionId,
            id_destino_mision: ultimoDestino.id_destino_mision,
            tipo_evento: 'salida_destino'
          },
          select: { id_log: true }
        })

        if (!salida) {
          throw new Error(
            `No se puede finalizar: falta registrar la salida del último destino (${ultimoDestino.nombre_destino})`
          )
        }
      }

      // 1. Obtener la misión para saber qué vehículo actualizar
      const misionActual = await tx.mision.findUnique({
        where: { id_mision: misionId },
        select: { id_vehiculo: true }
      });

      // 2. Consolidar datos desde log_movimientos_mision y control_acceso_seguridad
      const logSalida = await tx.logMovimientoMision.findFirst({
        where: {
          id_mision: misionId,
          tipo_evento: 'salida_base'
        },
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
      if (
        misionActual?.id_vehiculo &&
        km !== null &&
        !isNaN(km)
      ) {
        await tx.vehiculo.update({
          where: { id_vehiculo: misionActual.id_vehiculo },
          data: { kilometraje_actual: km }
        });

        console.log(
          `[Finalize] Kilometraje del vehículo ${misionActual.id_vehiculo} actualizado a ${km}`
        );
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

    res.status(400).json({
      ok: false,
      error: error.message
    })
  }
}

export const getAll = async (_req: Request, res: Response) => {
  try {
    const misiones = await prisma.mision.findMany({
      include: {
        solicitante: { select: { id_usuario: true, nombre: true, correo: true } },
        unidad: true,
        vehiculo: true,
        motorista: true,
        destinos: { orderBy: { orden_visita: 'asc' }, include: { area_destino: true } },
        // Orden explícito: PanelMotorista usa .find() sobre este arreglo
        movimientos: { orderBy: { fecha_hora: 'asc' } },
        controles_acceso: true
      },
      orderBy: { fecha_solicitud: 'desc' }
    })

    res.json({ ok: true, misiones })

  } catch (error: any) {

    res.status(400).json({
      ok: false,
      error: error.message
    })
  }
}

// Agregar un destino en ruta (solo Admin, misiones aprobada/en_curso)
export const addDestino = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const { nombre_destino, id_area_destino } = req.body

    if (!nombre_destino || !nombre_destino.toString().trim()) {
      return res.status(400).json({ ok: false, error: 'nombre_destino es obligatorio' })
    }

    const mision = await prisma.mision.findUnique({
      where: { id_mision: id },
      select: { id_mision: true, estado_mision: true }
    })

    if (!mision) {
      return res.status(404).json({ ok: false, error: 'La misión no existe' })
    }

    if (!['aprobada', 'en_curso'].includes(mision.estado_mision)) {
      return res.status(400).json({
        ok: false,
        error: 'Solo se pueden agregar destinos a misiones aprobadas o en curso'
      })
    }

    const ultimo = await prisma.destinoMision.findFirst({
      where: { id_mision: id },
      orderBy: { orden_visita: 'desc' },
      select: { orden_visita: true }
    })

    // No se toca Mision.destino: sigue siendo el primer destino
    const destino = await prisma.destinoMision.create({
      data: {
        id_mision: id,
        nombre_destino: nombre_destino.toString().trim(),
        id_area_destino: parseId(id_area_destino),
        orden_visita: (ultimo?.orden_visita ?? 0) + 1
      },
      include: { area_destino: true }
    })

    res.status(201).json({ ok: true, destino })
  } catch (error: any) {
    console.error('[Add Destino Error]', error)
    res.status(400).json({ ok: false, error: error.message })
  }
}

// Subir documento de respaldo (PDF/Imagen)
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: 'No se recibió ningún archivo'
      })
    }

    const anterior = await prisma.mision.findUnique({
      where: { id_mision: id },
      select: { documento_respaldo: true }
    })

    // 1. Subir el nuevo. Si esto falla, se conserva el anterior.
    const resultado = await cloudinaryService.uploadFile(
      req.file.buffer,
      process.env.CLOUDINARY_FOLDER || 'SUVT2/Misiones'
    )

    // 2. Guardar la URL pública del documento en la misión
    const mision = await prisma.mision.update({
      where: { id_mision: id },
      data: {
        documento_respaldo: resultado.secure_url
      },
      include: {
        destinos: { orderBy: { orden_visita: 'asc' }, include: { area_destino: true } }
      }
    })

    // 3. Borrar el anterior en Cloudinary. No bloqueante.
    const previo = anterior?.documento_respaldo
    if (previo && previo !== resultado.secure_url) {
      const parsed = extractPublicId(previo)
      if (parsed) {
        try {
          await cloudinaryService.deleteFile(parsed.publicId, parsed.resourceType)
        } catch (e) {
          logger.warn(`No se pudo borrar el documento anterior: ${(e as Error).message}`)
        }
      }
    }

    res.json({
      ok: true,
      mision,
      cloudinary: {
        public_id: resultado.public_id,
        resource_type: resultado.resource_type
      }
    })

  } catch (error: any) {

    console.error('[Upload Document Error]', error)

    res.status(400).json({
      ok: false,
      error: error.message
    })
  }
}

// Eliminar el documento de respaldo (solo Admin)
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const mision = await prisma.mision.findUnique({ where: { id_mision: id } })

    if (!mision?.documento_respaldo) {
      return res.status(404).json({ ok: false, error: 'La misión no tiene documento asociado' })
    }

    const parsed = extractPublicId(mision.documento_respaldo)
    if (parsed) {
      try {
        await cloudinaryService.deleteFile(parsed.publicId, parsed.resourceType)
      } catch (e) {
        logger.warn(`No se pudo borrar de Cloudinary ${parsed.publicId}: ${(e as Error).message}`)
      }
    }

    await prisma.mision.update({ where: { id_mision: id }, data: { documento_respaldo: null } })
    res.json({ ok: true })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
}
