import { Router } from 'express'
import { aiAssistantController } from '../../controllers/aiAssistant.controller'
import { authenticate } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { aiAssistantMessageSchema } from '../../validators/utility.validator'

const router = Router()

// All AI assistant routes require authentication
router.use(authenticate)

// POST /api/v1/utilities/ai-assistant/message
router.post(
  '/message',
  validate(aiAssistantMessageSchema, 'body'),
  aiAssistantController.sendMessage,
)

// GET /api/v1/utilities/ai-assistant/conversations
router.get('/conversations', aiAssistantController.getConversations)

// GET /api/v1/utilities/ai-assistant/conversations/:conversationId
router.get('/conversations/:conversationId', aiAssistantController.getConversationHistory)

export default router
