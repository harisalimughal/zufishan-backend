import { Router } from 'express'
import { hijriDateController } from '../../controllers/hijriDate.controller'
import { validate } from '../../middlewares/validate.middleware'
import { hijriDateQuerySchema } from '../../validators/utility.validator'

const router = Router()

// GET /api/v1/utilities/hijri-date?date=YYYY-MM-DD
router.get(
  '/',
  validate(hijriDateQuerySchema, 'query'),
  hijriDateController.convertToHijri,
)

export default router
