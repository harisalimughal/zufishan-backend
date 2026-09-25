import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { hijriDateService } from '../services/hijriDate.service'
import type { HijriDateQuery } from '../validators/utility.validator'

export const hijriDateController = {
  /**
   * GET /api/v1/utilities/hijri-date
   * Query: { date? }  — defaults to today if omitted
   */
  convertToHijri: asyncHandler(async (req: Request, res: Response) => {
    const data = await hijriDateService.convertToHijri(req.query as unknown as HijriDateQuery)
    res.status(200).json({ success: true, message: 'Hijri date converted', data })
  }),
}
