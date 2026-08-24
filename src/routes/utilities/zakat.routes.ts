import { Router } from 'express'
import { zakatController } from '../../controllers/zakat.controller'
import { validate } from '../../middlewares/validate.middleware'
import { zakatCalculateSchema } from '../../validators/utility.validator'

const router = Router()

// POST /api/v1/utilities/zakat/calculate
router.post(
  '/calculate',
  validate(zakatCalculateSchema, 'body'),
  zakatController.calculateZakat,
)

export default router
