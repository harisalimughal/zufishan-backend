import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { zakatNisabService, type NisabMethodology } from '../services/zakat.service'
import { zakatCalculatorService } from '../services/zakatCalculator.service'
import type {
  NisabRateQuery,
  ZakatCalculateBody,
} from '../validators/utility.validator'

export const zakatController = {
  /**
   * GET /api/v1/utilities/zakat/nisab-rate?currency=PKR&methodology=SOUTH_ASIAN
   *
   * Returns live (or cached) gold/silver Nisab threshold rates.
   * - currency: auto-detected from frontend IP/locale (defaults to USD if not sent)
   * - methodology: SOUTH_ASIAN (7.5 tola = 87.48g, Darul Uloom Deoband) or AAOIFI (85g)
   * - isStale + staleDays fields indicate when cached data is older than today
   */
  getNisabRate: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as NisabRateQuery
    const data = await zakatNisabService.getNisabRate(
      query.currency ?? 'USD',
      (query.methodology ?? 'SOUTH_ASIAN') as NisabMethodology,
    )
    res.status(200).json({ success: true, message: 'Nisab rate fetched', data })
  }),

  /**
   * GET /api/v1/utilities/zakat/methodologies
   * Returns all available Nisab methodology standards.
   */
  getMethodologies: asyncHandler(async (_req: Request, res: Response) => {
    const data = zakatNisabService.getMethodologies()
    res.status(200).json({ success: true, message: 'Nisab methodologies', data })
  }),

  /**
   * POST /api/v1/utilities/zakat/calculate
   * Body: { assets: [{ category, value, ... }], madhab, nisabThreshold?, currency? }
   */
  calculateZakat: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as ZakatCalculateBody
    const data = zakatCalculatorService.calculate(body)
    res.status(200).json({ success: true, message: 'Zakat calculated', data })
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
