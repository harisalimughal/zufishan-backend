import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { azkarService } from '../services/azkar.service'
import type { AzkarQuery } from '../validators/utility.validator'

export const azkarController = {
  /**
   * GET /api/v1/utilities/azkar
   * Query: { category?, page?, limit? }
   */
  getAzkar: asyncHandler(async (req: Request, res: Response) => {
    const data = await azkarService.getAzkar(req.query as unknown as AzkarQuery)
    res.status(200).json({ success: true, message: 'Azkar fetched', data })
  }),
}
