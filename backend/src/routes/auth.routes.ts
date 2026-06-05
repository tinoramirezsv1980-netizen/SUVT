import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { validarJWT } from '../middlewares/auth.middleware'

const router = Router()

router.post('/login', authController.login)
router.get('/me', validarJWT, authController.getMe)

export default router
