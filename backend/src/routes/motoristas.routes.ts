import { Router } from 'express'
import * as motoristaController from '../controllers/motoristas.controller'
import { validarJWT } from '../middlewares/auth.middleware'
import { bloquearAuxiliar } from '../middlewares/role.middleware'

const router = Router()

router.use(validarJWT)

router.get('/', motoristaController.getAll)
router.get('/:id', motoristaController.getById)

// Vehículos habituales del motorista
router.get('/:id/vehiculos', motoristaController.getVehiculos)
router.post('/:id/vehiculos', bloquearAuxiliar, motoristaController.addVehiculo)
router.delete('/:id/vehiculos/:idVehiculo', bloquearAuxiliar, motoristaController.removeVehiculo)

// Rutas de escritura protegidas contra rol Auxiliar
router.post('/', bloquearAuxiliar, motoristaController.create)
router.patch('/:id', bloquearAuxiliar, motoristaController.update)
router.delete('/:id', bloquearAuxiliar, motoristaController.remove)

export default router
