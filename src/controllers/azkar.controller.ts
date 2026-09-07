import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { azkarService } from '../services/azkar.service'
import type { AzkarItemsQuery } from '../validators/utility.validator'

export const azkarController = {
  /**
   * GET /api/v1/utilities/azkar/categories
   */
  getCategories: asyncHandler(async (_req: Request, res: Response) => {
    const data = await azkarService.getCategories()
    res.status(200).json({ success: true, message: 'Azkar categories fetched', data })
  }),

  /**
   * GET /api/v1/utilities/azkar/:categoryId/items
   *
   * `req.query` is already parsed and validated by the `azkarItemsQuerySchema`
   * middleware, so the cast here is safe.
   */
  getItemsByCategory: asyncHandler(async (req: Request, res: Response) => {
    const categoryId = req.params.categoryId as string
    const data = await azkarService.getItemsByCategory(categoryId, req.query as unknown as AzkarItemsQuery)
    res.status(200).json({ success: true, message: 'Azkar items fetched', data })
  }),

  /**
   * GET /api/v1/utilities/azkar/item/:id
   */
  getItemById: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string
    const data = await azkarService.getItemById(id)
    res.status(200).json({ success: true, message: 'Azkar item fetched', data })
  }),

  // Legacy — kept for backward compat
  getAzkar: asyncHandler(async (_req: Request, res: Response) => {
    const data = await azkarService.getCategories()
    res.status(200).json({ success: true, message: 'Azkar fetched', data })
  }),
}
