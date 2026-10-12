import { Request, Response } from 'express'
import prisma from '../prisma/client'

// Catálogo de áreas para el formulario multi-destino
export const getAll = async (_req: Request, res: Response) => {
  try {
    const areas = await prisma.areaDestino.findMany({
      where: { activo: true },
      orderBy: { nombre_area: 'asc' }
    })
    res.json({ ok: true, areas })
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message })
  }
}
