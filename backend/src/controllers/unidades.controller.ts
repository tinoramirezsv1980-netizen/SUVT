import { Request, Response } from 'express'
import prisma from '../prisma/client'

export const getAll = async (_req: Request, res: Response) => {
  try {
    const unidades = await prisma.unidadOrganizativa.findMany({
      include: { jefe: true }
    })
    res.json({ ok: true, unidades })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const { nombre_unidad, id_jefe_usuario } = req.body
    const unidad = await prisma.unidadOrganizativa.create({
      data: {
        nombre_unidad,
        id_jefe_usuario: id_jefe_usuario ? parseInt(id_jefe_usuario) : undefined
      }
    })
    res.status(201).json({ ok: true, unidad })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}
