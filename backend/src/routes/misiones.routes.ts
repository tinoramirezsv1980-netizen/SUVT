import { Router } from 'express'
import * as misionesCtrl from '../controllers/misiones.controller'
import { validarJWT } from '../middlewares/auth.middleware'
import { permitirSoloAdmin } from '../middlewares/role.middleware'
import { uploadMisionDoc } from '../middlewares/upload.middleware'

const router = Router()

// Proteger todas las rutas con autenticación JWT
router.use(validarJWT)

router.get('/', misionesCtrl.getAll)
router.post('/', misionesCtrl.create)
router.patch('/:id/assign', permitirSoloAdmin, misionesCtrl.assign)
router.post('/access', misionesCtrl.registerAccess)
router.post('/movement', misionesCtrl.addMovement)
router.patch('/:id/finalize', misionesCtrl.finalize)
router.patch('/:id/upload', uploadMisionDoc.single('documento'), misionesCtrl.uploadDocument)

export default router
