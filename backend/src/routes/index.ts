import { Router } from 'express'
import authRoutes from './auth.routes'
import motoristaRoutes from './motoristas.routes'
import vehiculoRoutes from './vehiculos.routes'
// import asignacionRoutes from './asignaciones.routes'
import usuariosRoutes from './usuarios.routes'
import misionesRoutes from './misiones.routes'
import unidadesRoutes from './unidades.routes'
import areasRoutes from './areas.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/usuarios', usuariosRoutes)
router.use('/motoristas', motoristaRoutes)
router.use('/vehiculos', vehiculoRoutes)
// router.use('/asignaciones', asignacionRoutes)
router.use('/misiones', misionesRoutes)
router.use('/unidades', unidadesRoutes)
router.use('/areas', areasRoutes)

export default router
