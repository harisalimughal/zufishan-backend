import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { aiAssistantService } from '../services/aiAssistant.service'

export const aiAssistantController = {
  /**
   * POST /api/v1/utilities/ai-assistant/chat
   * Body: AiAssistantMessageBody
   * Auth: required
   */
  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await aiAssistantService.sendMessage(userId, req.body)
    res.status(200).json({ success: true, message: 'AI response received', data })
  }),

  /**
   * GET /api/v1/utilities/ai-assistant/history
   * Auth: required
   */
  getConversations: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await aiAssistantService.getConversations(userId)
    res.status(200).json({ success: true, message: 'Conversations fetched', data })
  }),

  /**
   * GET /api/v1/utilities/ai-assistant/conversations/:conversationId
   * Auth: required
   */
  getConversationHistory: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const conversationId = req.params.conversationId as string
    const data = await aiAssistantService.getConversationHistory(conversationId, userId)
    res.status(200).json({ success: true, message: 'Conversation history fetched', data })
  }),

  /**
   * POST /api/v1/utilities/ai-assistant/feedback
   * Body: AiAssistantFeedbackBody
   * Auth: required
   */
  submitFeedback: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await aiAssistantService.submitFeedback(userId, req.body)
    res.status(200).json({ success: true, message: 'Feedback submitted', data })
  }),

  /**
   * GET /api/v1/utilities/ai-assistant/admin/logs
   * Auth: required + ADMIN role
   */
  getAdminLogs: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAssistantService.getAdminLogs(req.query as never)
    res.status(200).json({ success: true, message: 'AI logs fetched', data })
  }),
}
