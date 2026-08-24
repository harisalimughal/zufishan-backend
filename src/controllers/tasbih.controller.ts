import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { tasbihService } from '../services/tasbih.service'

export const tasbihController = {
  /**
   * POST /api/v1/utilities/tasbih/sessions
   * Body: TasbihSaveBody
   * Auth: required
   */
  saveSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await tasbihService.saveSession(userId, req.body)
    res.status(201).json({ success: true, message: 'Tasbih session saved', data })
  }),

  /**
   * GET /api/v1/utilities/tasbih/sessions
   * Auth: required
   */
  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await tasbihService.getHistory(userId)
    res.status(200).json({ success: true, message: 'Tasbih history fetched', data })
  }),

  /**
   * GET /api/v1/utilities/tasbih/stats
   * Auth: required
   */
  getStats: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await tasbihService.getStats(userId)
    res.status(200).json({ success: true, message: 'Tasbih stats fetched', data })
  }),
}
