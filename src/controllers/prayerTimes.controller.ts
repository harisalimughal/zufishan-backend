import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { prayerTimesService } from '../services/prayerTimes.service'
import type { PrayerTimesQuery } from '../validators/utility.validator'

export const prayerTimesController = {
  /**
   * GET /api/v1/utilities/prayer-times
   *
   * Query params (Zod-validated by middleware before this runs):
   *   lat | latitude   – decimal degrees, -90..90  (required)
   *   lng | longitude  – decimal degrees, -180..180 (required)
   *   method           – AlAdhan method name, default "MWL"
   *   asrMethod        – 0 (Standard/Shafi'i) | 1 (Hanafi), default 0
   *   date             – YYYY-MM-DD, default today (UTC)
   */
  getPrayerTimes: asyncHandler(async (req: Request, res: Response) => {
    const data = await prayerTimesService.getPrayerTimes(
      req.query as unknown as PrayerTimesQuery,
    )

    res.status(200).json({
      success: true,
      message: 'Prayer times fetched',
      data,
    })
  }),
}
