import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { zakatService } from '../services/zakat.service'

export const zakatController = {
  /**
   * POST /api/v1/utilities/zakat/calculate
   * Body: ZakatCalculateBody
   */
  calculateZakat: asyncHandler(async (req: Request, res: Response) => {
    const data = await zakatService.calculateZakat(req.body)
    res.status(200).json({ success: true, message: 'Zakat calculated', data })
  }),
}
