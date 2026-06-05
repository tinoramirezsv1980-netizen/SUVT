import { Router } from 'express'
import * as unidadesCtrl from '../controllers/unidades.controller'

const router = Router()

router.get('/', unidadesCtrl.getAll)
router.post('/', unidadesCtrl.create)

export default router
