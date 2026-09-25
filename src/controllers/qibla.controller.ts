import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { qiblaService } from '../services/qibla.service'
import type { QiblaQuery } from '../validators/utility.validator'

export const qiblaController = {
  /**
   * GET /api/v1/utilities/qibla
   * Query: { latitude, longitude }
   */
  getQiblaDirection: asyncHandler(async (req: Request, res: Response) => {
    const data = await qiblaService.getQiblaDirection(req.query as unknown as QiblaQuery)
    res.status(200).json({ success: true, message: 'Qibla direction calculated', data })
  }),
}
