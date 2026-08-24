import { Router } from 'express'
import { aiAssistantController } from '../../controllers/aiAssistant.controller'
import { authenticate } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/admin.middleware'
import { validate } from '../../middlewares/validate.middleware'
import {
  aiAssistantMessageSchema,
  aiAssistantFeedbackSchema,
  adminAiLogsQuerySchema,
} from '../../validators/utility.validator'

const router = Router()

// ── User routes (authenticated) ──────────────────────────────

// POST /api/v1/utilities/ai-assistant/chat
router.post(
  '/chat',
  authenticate,
  validate(aiAssistantMessageSchema, 'body'),
  aiAssistantController.sendMessage,
)

// GET /api/v1/utilities/ai-assistant/history
router.get('/history', authenticate, aiAssistantController.getConversations)

// GET /api/v1/utilities/ai-assistant/conversations/:conversationId
router.get(
  '/conversations/:conversationId',
  authenticate,
  aiAssistantController.getConversationHistory,
)

// POST /api/v1/utilities/ai-assistant/feedback
router.post(
  '/feedback',
  authenticate,
  validate(aiAssistantFeedbackSchema, 'body'),
  aiAssistantController.submitFeedback,
)

// ── Admin routes ──────────────────────────────────────────────

// GET /api/v1/utilities/ai-assistant/admin/logs
router.get(
  '/admin/logs',
  authenticate,
  requireAdmin,
  validate(adminAiLogsQuerySchema, 'query'),
  aiAssistantController.getAdminLogs,
)

export default router
