import { Request, Response } from 'express'
import prisma from '../prisma/client'

export const getAll = async (_req: Request, res: Response) => {
  const vehiculos = await prisma.vehiculo.findMany({
    orderBy: { placa: 'asc' }
  })
  res.json({ ok: true, vehiculos })
}

export const getById = async (req: Request, res: Response) => {
  const { id } = req.params
  const vehiculo = await prisma.vehiculo.findUnique({
    where: { id_vehiculo: parseInt(id) }
  })
  if (!vehiculo) return res.status(404).json({ ok: false, error: 'No encontrado' })
  res.json({ ok: true, vehiculo })
}

export const create = async (req: Request, res: Response) => {
  try {
    const nuevo = await prisma.vehiculo.create({ data: req.body })
    res.status(201).json({ ok: true, vehiculo: nuevo })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const actualizado = await prisma.vehiculo.update({
      where: { id_vehiculo: parseInt(id) },
      data: req.body
    })
    res.json({ ok: true, vehiculo: actualizado })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.vehiculo.delete({ where: { id_vehiculo: parseInt(id) } })
    res.json({ ok: true, message: 'Eliminado correctamente' })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}
