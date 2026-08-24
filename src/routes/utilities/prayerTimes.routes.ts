import { Router } from 'express'
import { prayerTimesController } from '../../controllers/prayerTimes.controller'
import { validate } from '../../middlewares/validate.middleware'
import { prayerTimesQuerySchema } from '../../validators/utility.validator'

const router = Router()

// GET /api/v1/utilities/prayer-times?latitude=&longitude=&method=&date=
router.get(
  '/',
  validate(prayerTimesQuerySchema, 'query'),
  prayerTimesController.getPrayerTimes,
)

export default router
