import { Router } from 'express'
import { azkarController } from '../../controllers/azkar.controller'
import { validate } from '../../middlewares/validate.middleware'
import {
  azkarCategoryParamSchema,
  azkarItemParamSchema,
  azkarItemsQuerySchema,
} from '../../validators/utility.validator'

const router = Router()

// GET /api/v1/utilities/azkar/categories
router.get('/categories', azkarController.getCategories)

// GET /api/v1/utilities/azkar/:categoryId/items
router.get(
  '/:categoryId/items',
  validate(azkarCategoryParamSchema, 'params'),
  validate(azkarItemsQuerySchema, 'query'),
  azkarController.getItemsByCategory,
)

// GET /api/v1/utilities/azkar/item/:id
router.get(
  '/item/:id',
  validate(azkarItemParamSchema, 'params'),
  azkarController.getItemById,
)

export default router
