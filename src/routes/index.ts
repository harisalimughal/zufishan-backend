import { Router } from 'express'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'

const router = Router()

// Mount routes
router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

export default router