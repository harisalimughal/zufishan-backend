import { Router } from 'express'
import { azkarController } from '../../controllers/azkar.controller'
import { validate } from '../../middlewares/validate.middleware'
import { azkarQuerySchema } from '../../validators/utility.validator'

const router = Router()

// GET /api/v1/utilities/azkar?category=morning&page=1&limit=20
router.get(
  '/',
  validate(azkarQuerySchema, 'query'),
  azkarController.getAzkar,
)

export default router
