import { Router } from 'express'
import { zakatController } from '../../controllers/zakat.controller'
import { authenticate } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import {
  zakatCalculateSchema,
  zakatHistoryQuerySchema,
} from '../../validators/utility.validator'

const router = Router()

// GET /api/v1/utilities/zakat/nisab-rate  (public)
router.get('/nisab-rate', zakatController.getNisabRate)

// POST /api/v1/utilities/zakat/calculate  (public)
router.post(
  '/calculate',
  validate(zakatCalculateSchema, 'body'),
  zakatController.calculateZakat,
)

// GET /api/v1/utilities/zakat/history  (auth required)
router.get(
  '/history',
  authenticate,
  validate(zakatHistoryQuerySchema, 'query'),
  zakatController.getHistory,
)

export default router
