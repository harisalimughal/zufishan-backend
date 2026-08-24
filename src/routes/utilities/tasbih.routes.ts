import { Router } from 'express'
import { tasbihController } from '../../controllers/tasbih.controller'
import { authenticate } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { tasbihSaveSchema } from '../../validators/utility.validator'

const router = Router()

// All tasbih routes require authentication (user-specific data)
router.use(authenticate)

// POST /api/v1/utilities/tasbih/sessions
router.post(
  '/sessions',
  validate(tasbihSaveSchema, 'body'),
  tasbihController.saveSession,
)

// GET /api/v1/utilities/tasbih/sessions  (history)
router.get('/sessions', tasbihController.getHistory)

// GET /api/v1/utilities/tasbih/stats
router.get('/stats', tasbihController.getStats)

export default router
