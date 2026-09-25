import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { requireAdmin } from '../middlewares/admin.middleware'
import { adminController } from '../controllers/admin.controller'
import { MarketplaceVendorController } from '../controllers/marketplace-vendor.controller'
import { MarketplaceAdminController } from '../controllers/marketplace-admin.controller'
import { validate } from '../middlewares/validate.middleware'
import { z } from 'zod'
import { rejectVendorSchema, suspendVendorSchema } from '../validators/marketplace-vendor.validator'
import marketplaceAdminExtensionRoutes from './marketplace-admin-extension.routes'
import { MarketplaceOrderController } from '../controllers/marketplace-order.controller'
import { marketplacePaymentController } from '../controllers/marketplace-payment.controller'
import { orderIdSchema } from '../validators/marketplace-order.validator'
import { refundPaymentSchema } from '../validators/marketplace-payment.validator'

const router = Router()
const marketplaceVendorController = new MarketplaceVendorController()
const marketplaceAdminController = new MarketplaceAdminController()
const marketplaceOrderController = new MarketplaceOrderController()

// All admin routes require authentication AND admin role
router.use(authenticate)
router.use(requireAdmin)

// Get all users
router.get('/users', adminController.listUsers)

// Get admin stats
router.get('/stats', adminController.getStats)

const userIdParamSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
})

// Get a single user
router.get('/users/:id', validate(userIdParamSchema, 'params'), adminController.getUser)

router.delete('/users/:id', validate(userIdParamSchema, 'params'), adminController.deleteUser)

const vendorIdParamSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID is required'),
})

router.get('/marketplace/stats', marketplaceAdminController.getStats)
router.get('/marketplace/overview', marketplaceOrderController.getAdminOverview)
router.post(
  '/marketplace/orders/:orderId/refund',
  validate(orderIdSchema, 'params'),
  validate(refundPaymentSchema),
  marketplacePaymentController.refund
)
router.use('/marketplace', marketplaceAdminExtensionRoutes)
router.get('/marketplace/vendors', marketplaceVendorController.getAllVendors)
router.get('/marketplace/vendor-applications', marketplaceVendorController.getPendingVendors)
router.get(
  '/marketplace/vendors/:vendorId',
  validate(vendorIdParamSchema, 'params'),
  marketplaceVendorController.getVendorById
)
router.post(
  '/marketplace/vendors/:vendorId/approval',
  validate(vendorIdParamSchema, 'params'),
  marketplaceVendorController.approveVendor
)
router.post(
  '/marketplace/vendors/:vendorId/rejection',
  validate(vendorIdParamSchema, 'params'),
  validate(rejectVendorSchema),
  marketplaceVendorController.rejectVendor
)
router.post(
  '/marketplace/vendors/:vendorId/suspension',
  validate(vendorIdParamSchema, 'params'),
  validate(suspendVendorSchema),
  marketplaceVendorController.suspendVendor
)

export default router
