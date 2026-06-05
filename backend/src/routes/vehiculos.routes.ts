import { Router } from 'express'
import * as vehiculoController from '../controllers/vehiculos.controller'
import { validarJWT } from '../middlewares/auth.middleware'
import { bloquearAuxiliar } from '../middlewares/role.middleware'

const router = Router()

router.use(validarJWT)

router.get('/', vehiculoController.getAll)
router.get('/:id', vehiculoController.getById)

// Rutas de escritura protegidas contra rol Auxiliar
router.post('/', bloquearAuxiliar, vehiculoController.create)
router.patch('/:id', bloquearAuxiliar, vehiculoController.update)
router.delete('/:id', bloquearAuxiliar, vehiculoController.remove)

export default router
