import { Router } from 'express'
import { qiblaController } from '../../controllers/qibla.controller'
import { validate } from '../../middlewares/validate.middleware'
import { qiblaQuerySchema } from '../../validators/utility.validator'

const router = Router()

// GET /api/v1/utilities/qibla?latitude=&longitude=
router.get(
  '/',
  validate(qiblaQuerySchema, 'query'),
  qiblaController.getQiblaDirection,
)

export default router
