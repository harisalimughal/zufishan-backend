import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { prayerTimesService } from '../services/prayerTimes.service'
import type { PrayerTimesQuery } from '../validators/utility.validator'

export const prayerTimesController = {
  /**
   * GET /api/v1/utilities/prayer-times
   * Query: { latitude, longitude, method?, date? }
   */
  getPrayerTimes: asyncHandler(async (req: Request, res: Response) => {
    const data = await prayerTimesService.getPrayerTimes(req.query as unknown as PrayerTimesQuery)
    res.status(200).json({ success: true, message: 'Prayer times fetched', data })
  }),
}
