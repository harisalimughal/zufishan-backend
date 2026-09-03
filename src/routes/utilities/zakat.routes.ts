import { Router } from 'express'
import { zakatController } from '../../controllers/zakat.controller'
import { authenticate } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import {
  nisabRateQuerySchema,
  zakatCalculateSchema,
  zakatHistoryQuerySchema,
} from '../../validators/utility.validator'

const router = Router()

// GET /api/v1/utilities/zakat/nisab-rate?currency=PKR&methodology=SOUTH_ASIAN  (public)
router.get(
  '/nisab-rate',
  validate(nisabRateQuerySchema, 'query'),
  zakatController.getNisabRate,
)

// GET /api/v1/utilities/zakat/methodologies  (public — returns available Nisab standards)
router.get('/methodologies', zakatController.getMethodologies)

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
