import { Router } from 'express'
import { aiAssistantController } from '../../controllers/aiAssistant.controller'
import { authenticate } from '../../middlewares/auth.middleware'
import { requireAdmin } from '../../middlewares/admin.middleware'
import { validate } from '../../middlewares/validate.middleware'
import {
  aiAssistantMessageSchema,
  aiAssistantFeedbackSchema,
  aiHistoryQuerySchema,
  adminAiLogsQuerySchema,
  adminIngestSchema,
  flagConversationSchema,
  flagLogSchema,
  aiConversationParamSchema,
  aiLogParamSchema,
} from '../../validators/utility.validator'

const router = Router()

// ── User routes (authenticated) ──────────────────────────────────────────────

// POST /api/v1/utilities/ai-assistant/chat
router.post('/chat',     authenticate, validate(aiAssistantMessageSchema, 'body'), aiAssistantController.sendMessage)

// GET  /api/v1/utilities/ai-assistant/history?conversationId=
router.get('/history',   authenticate, validate(aiHistoryQuerySchema, 'query'), aiAssistantController.getHistory)

// GET  /api/v1/utilities/ai-assistant/conversations/:conversationId
router.get(
  '/conversations/:conversationId',
  authenticate,
  validate(aiConversationParamSchema, 'params'),
  aiAssistantController.getConversationHistory,
)

// POST /api/v1/utilities/ai-assistant/feedback
router.post('/feedback', authenticate, validate(aiAssistantFeedbackSchema, 'body'), aiAssistantController.submitFeedback)

// ── Admin / Moderator routes ──────────────────────────────────────────────────

/**
 * GET /api/v1/utilities/ai-assistant/admin/logs
 *
 * Full audit log list with 12 filter dimensions.
 * Supports: userId, conversationId, isRedirected, isAdversarial,
 *           isOutOfScope, isFlagged, topicCategory, errorStatus,
 *           modelUsed, rating, role, dateFrom, dateTo, page, limit
 *
 * PII policy: content is truncated to contentPreview in list view.
 * Use GET /admin/logs/:logId for full content.
 */
router.get(
  '/admin/logs',
  authenticate,
  requireAdmin,
  validate(adminAiLogsQuerySchema, 'query'),
  aiAssistantController.getAdminLogs,
)

/**
 * GET /api/v1/utilities/ai-assistant/admin/logs/:logId
 *
 * Full detail for a single log entry including complete message content.
 */
router.get(
  '/admin/logs/:logId',
  authenticate,
  requireAdmin,
  validate(aiLogParamSchema, 'params'),
  aiAssistantController.getAdminLogById,
)

/**
 * PATCH /api/v1/utilities/ai-assistant/admin/conversations/:conversationId/flag
 *
 * Flags or unflags a conversation thread for moderator review.
 * Body: { isFlagged: boolean, reason?: string }
 */
router.patch(
  '/admin/conversations/:conversationId/flag',
  authenticate,
  requireAdmin,
  validate(aiConversationParamSchema, 'params'),
  validate(flagConversationSchema, 'body'),
  aiAssistantController.flagConversation,
)

/**
 * PATCH /api/v1/utilities/ai-assistant/admin/logs/:logId/flag
 *
 * Flags or unflags an individual log entry for moderator review.
 * Body: { isFlagged: boolean }
 */
router.patch(
  '/admin/logs/:logId/flag',
  authenticate,
  requireAdmin,
  validate(aiLogParamSchema, 'params'),
  validate(flagLogSchema, 'body'),
  aiAssistantController.flagLog,
)

/**
 * POST /api/v1/utilities/ai-assistant/admin/ingest
 *
 * Triggers the RAG ingest pipeline for a single document.
 * Use scripts/ingestCorpus.ts for bulk ingestion.
 */
router.post(
  '/admin/ingest',
  authenticate,
  requireAdmin,
  validate(adminIngestSchema, 'body'),
  aiAssistantController.ingestDocument,
)

export default router
