import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { aiAssistantService } from '../services/aiAssistant.service'
import type { AdminAiLogsQuery, AiHistoryQuery } from '../validators/utility.validator'
import type { RagSourceType } from '@prisma/client'

export const aiAssistantController = {
  /**
   * POST /api/v1/utilities/ai-assistant/chat
   */
  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await aiAssistantService.sendMessage(userId, req.body)
    return res.status(200).json({ success: true, message: 'AI response received', data })
  }),

  /**
   * GET /api/v1/utilities/ai-assistant/history?conversationId=
   *
   * Query params:
   *   conversationId (optional): when present, returns messages for that thread
   *   page (optional): positive int, default 1
   *   limit (optional): positive int, default 20
   */
  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.getHistory(
      req.user!.id,
      req.query as unknown as AiHistoryQuery,
    )
    const message = req.query.conversationId ? 'Conversation history fetched' : 'Conversations fetched'
    return res.status(200).json({ success: true, message, data })
  }),

  /**
   * GET /api/v1/utilities/ai-assistant/history (backward-compatible alias)
   */
  getConversations: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.getHistory(
      req.user!.id,
      req.query as unknown as AiHistoryQuery,
    )
    return res.status(200).json({ success: true, message: 'Conversations fetched', data })
  }),

  /**
   * GET /api/v1/utilities/ai-assistant/conversations/:conversationId
   */
  getConversationHistory: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.getConversationHistory(
      req.params.conversationId as string,
      req.user!.id,
    )
    return res.status(200).json({ success: true, message: 'Conversation history fetched', data })
  }),

  /**
   * POST /api/v1/utilities/ai-assistant/feedback
   */
  submitFeedback: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.submitFeedback(req.user!.id, req.body)
    return res.status(200).json({ success: true, message: 'Feedback submitted successfully', data })
  }),

  // ─── Admin Endpoints ─────────────────────────────────────────────────────────

  /**
   * GET /api/v1/utilities/ai-assistant/admin/logs
   * GET /api/v1/utilities/admin/ai-assistant/logs  (alias)
   *
   * Paginated + filtered audit log list.
   * Content is TRUNCATED to contentPreview in list view (PII policy).
   *
   * Query params:
   *   userId, conversationId,
   *   isRedirected, isAdversarial, isOutOfScope, isFlagged,
   *   topicCategory, errorStatus, modelUsed, rating, role,
   *   dateFrom, dateTo, page, limit
   */
  getAdminLogs: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.getAdminLogs(req.query as unknown as AdminAiLogsQuery)
    return res.status(200).json({ success: true, message: 'AI audit logs fetched', data })
  }),

  /**
   * GET /api/v1/utilities/ai-assistant/admin/logs/:logId
   *
   * Full detail for a single log entry including complete content.
   * Admin/Moderator only.
   */
  getAdminLogById: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.getAdminLogById(req.params.logId as string)
    return res.status(200).json({ success: true, message: 'Log entry fetched', data })
  }),

  /**
   * PATCH /api/v1/utilities/ai-assistant/admin/conversations/:conversationId/flag
   * Body: { isFlagged: boolean, reason?: string }
   *
   * Flags or unflags an entire conversation thread for moderator review.
   */
  flagConversation: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.flagConversation(
      req.params.conversationId as string,
      req.body,
    )
    return res.status(200).json({
      success: true,
      message: `Conversation ${data.isFlagged ? 'flagged' : 'unflagged'} successfully`,
      data,
    })
  }),

  /**
   * PATCH /api/v1/utilities/ai-assistant/admin/logs/:logId/flag
   * Body: { isFlagged: boolean }
   *
   * Flags or unflags an individual log entry for moderator review.
   */
  flagLog: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.flagLog(req.params.logId as string, req.body)
    return res.status(200).json({
      success: true,
      message: `Log entry ${data.isFlagged ? 'flagged' : 'unflagged'} successfully`,
      data,
    })
  }),

  /**
   * POST /api/v1/utilities/ai-assistant/admin/ingest
   */
  ingestDocument: asyncHandler(async (req: Request, res: Response) => {
    const { sourceType, title, content, sourceId, url } = req.body as {
      sourceType: RagSourceType; title: string; content: string; sourceId?: string; url?: string
    }
    const data = await aiAssistantService.ingestDocument({ sourceType, title, content, sourceId, url })
    return res.status(201).json({ success: true, message: data.message, data: { documentId: data.documentId } })
  }),
}
