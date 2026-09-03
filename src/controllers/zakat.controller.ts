import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { zakatNisabService } from '../services/zakat.service'
import type { NisabRateQuery } from '../validators/utility.validator'

export const zakatController = {
  /**
   * GET /api/v1/utilities/zakat/nisab-rate?currency=USD
   * Returns live (or cached) gold/silver Nisab threshold rates.
   * isStale + staleDays fields indicate if the data is from a previous day.
   */
  getNisabRate: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as NisabRateQuery
    const data = await zakatNisabService.getNisabRate(query.currency ?? 'USD')
    res.status(200).json({ success: true, message: 'Nisab rate fetched', data })
  }),

  /**
   * POST /api/v1/utilities/zakat/calculate
   * Body: ZakatCalculateBody
   */
  calculateZakat: asyncHandler(async (_req: Request, res: Response) => {
    // TODO: implement calculateZakat in zakatNisabService
    res.status(501).json({ success: false, message: 'Zakat calculator not yet implemented' })
  }),

  /**
   * GET /api/v1/utilities/zakat/history
   * Auth: required
   */
  getHistory: asyncHandler(async (_req: Request, res: Response) => {
    // TODO: implement history via zakatNisabRepository
    res.status(501).json({ success: false, message: 'Zakat history not yet implemented' })
  }),
}
