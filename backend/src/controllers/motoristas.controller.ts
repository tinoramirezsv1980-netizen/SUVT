import { Request, Response } from 'express'
import prisma from '../prisma/client'

export const getAll = async (_req: Request, res: Response) => {
  const motoristas = await prisma.motorista.findMany({
    include: {
      conductores_habituales: {
        where: { activo: true },
        include: { vehiculo: true }
      }
    },
    orderBy: { apellido: 'asc' }
  })
  res.json({ ok: true, motoristas })
}

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params
  const motorista = await prisma.motorista.findUnique({
    where: { id_motorista: parseInt(id) },
    include: {
      conductores_habituales: {
        where: { activo: true },
        include: { vehiculo: true }
      }
    }
  })
  if (!motorista) return res.status(404).json({ ok: false, error: 'No encontrado' })
  res.json({ ok: true, motorista })
}

export const create = async (req: Request, res: Response) => {
  try {
    const nuevo = await prisma.motorista.create({ data: req.body })
    res.status(201).json({ ok: true, motorista: nuevo })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const actualizado = await prisma.motorista.update({
      where: { id_motorista: parseInt(id) },
      data: req.body
    })
    res.json({ ok: true, motorista: actualizado })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.motorista.delete({ where: { id_motorista: parseInt(id) } })
    res.json({ ok: true, message: 'Eliminado correctamente' })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

// ── Vehículos habituales del motorista ──────────────────────

export const getVehiculos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const registros = await prisma.conductorHabitual.findMany({
      where: { id_motorista: parseInt(id), activo: true },
      include: { vehiculo: true }
    })
    const vehiculos = registros.map(r => r.vehiculo)
    res.json({ ok: true, vehiculos })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const addVehiculo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { id_vehiculo } = req.body

    // Verificar si ya existe la relación activa
    const existente = await prisma.conductorHabitual.findFirst({
      where: {
        id_motorista: parseInt(id),
        id_vehiculo: parseInt(id_vehiculo),
        activo: true
      }
    })

    if (existente) {
      return res.status(400).json({ ok: false, error: 'Este vehículo ya está asignado a este motorista' })
    }

    const registro = await prisma.conductorHabitual.create({
      data: {
        id_motorista: parseInt(id),
        id_vehiculo: parseInt(id_vehiculo),
        fecha_inicio: new Date(),
        activo: true
      }
    })
    res.status(201).json({ ok: true, conductor_habitual: registro })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const removeVehiculo = async (req: Request, res: Response) => {
  try {
    const { id, idVehiculo } = req.params

    // Buscar la relación activa y desactivarla
    const registro = await prisma.conductorHabitual.findFirst({
      where: {
        id_motorista: parseInt(id),
        id_vehiculo: parseInt(idVehiculo),
        activo: true
      }
    })

    if (!registro) {
      return res.status(404).json({ ok: false, error: 'Relación no encontrada' })
    }

    await prisma.conductorHabitual.update({
      where: { id_conductor_hab: registro.id_conductor_hab },
      data: { activo: false }
    })

    res.json({ ok: true, message: 'Vehículo desasignado correctamente' })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}
