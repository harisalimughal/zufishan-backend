import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireAdmin } from '../middlewares/admin.middleware'
import { adminController } from '../controllers/admin.controller'
import { validate } from '../middlewares/validate.middleware'
import { z } from 'zod'

const router = Router()

// All admin routes require authentication AND admin role
router.use(authenticate)
router.use(requireAdmin)

// Get all users
router.get('/users', adminController.listUsers)

// Get admin stats
router.get('/stats', adminController.getStats)

// ✅ Fix: Validate params, not body
const deleteUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
})
router.delete('/users/:id', validate(deleteUserSchema, 'params'), adminController.deleteUser)

export default router