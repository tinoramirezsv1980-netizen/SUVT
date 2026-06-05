import { Router } from 'express'
import * as usuariosController from '../controllers/usuarios.controller'
import { validarJWT } from '../middlewares/auth.middleware'
import { permitirSoloAdmin } from '../middlewares/role.middleware'

const router = Router()

// Todas las rutas de gestión de usuarios requieren ser Admin
router.use(validarJWT)
router.use(permitirSoloAdmin)

router.get('/', usuariosController.getAll)
router.post('/', usuariosController.create)
router.patch('/:id', usuariosController.update)
router.patch('/:id/reset-password', usuariosController.resetPassword)
router.delete('/:id', usuariosController.remove)

export default router
