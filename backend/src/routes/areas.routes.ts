import { Router } from 'express'
import * as areasCtrl from '../controllers/areas.controller'
import { validarJWT } from '../middlewares/auth.middleware'

const router = Router()

router.use(validarJWT)

router.get('/', areasCtrl.getAll)

export default router
