import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator'

const router = Router()

// Public routes
router.post('/register', validate(registerSchema), authController.register)
router.post('/login', validate(loginSchema), authController.login)
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken)
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)

// Protected routes
router.use(authenticate)
router.post('/logout', authController.logout)
router.get('/me', authController.getMe)
router.put('/change-password', validate(changePasswordSchema), authController.changePassword)

export default router