import { Router } from 'express'
import authRoutes from './auth.routes'
import motoristaRoutes from './motoristas.routes'
import vehiculoRoutes from './vehiculos.routes'
// import asignacionRoutes from './asignaciones.routes'
import usuariosRoutes from './usuarios.routes'
import misionesRoutes from './misiones.routes'
import unidadesRoutes from './unidades.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/usuarios', usuariosRoutes)
router.use('/motoristas', motoristaRoutes)
router.use('/vehiculos', vehiculoRoutes)
// router.use('/asignaciones', asignacionRoutes)
router.use('/misiones', misionesRoutes)
router.use('/unidades', unidadesRoutes)

export default router
