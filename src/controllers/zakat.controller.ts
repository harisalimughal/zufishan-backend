import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { zakatService } from '../services/zakat.service'

export const zakatController = {
  /**
   * GET /api/v1/utilities/zakat/nisab-rate
   * Returns the latest gold/silver nisab threshold rates.
   */
  getNisabRate: asyncHandler(async (_req: Request, res: Response) => {
    const data = await zakatService.getNisabRate()
    res.status(200).json({ success: true, message: 'Nisab rate fetched', data })
  }),

  /**
   * POST /api/v1/utilities/zakat/calculate
   * Body: ZakatCalculateBody
   */
  calculateZakat: asyncHandler(async (req: Request, res: Response) => {
    const data = await zakatService.calculateZakat(req.body)
    res.status(200).json({ success: true, message: 'Zakat calculated', data })
  }),

  /**
   * GET /api/v1/utilities/zakat/history
   * Auth: required
   */
  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const data = await zakatService.getHistory(userId, req.query as never)
    res.status(200).json({ success: true, message: 'Zakat history fetched', data })
  }),
}
