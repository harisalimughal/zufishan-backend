import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { azkarService } from '../services/azkar.service'

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
   */
  getItemsByCategory: asyncHandler(async (req: Request, res: Response) => {
    const categoryId = req.params.categoryId as string
    const data = await azkarService.getItemsByCategory(categoryId, req.query as never)
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
  getAzkar: asyncHandler(async (req: Request, res: Response) => {
    const data = await azkarService.getCategories()
    res.status(200).json({ success: true, message: 'Azkar fetched', data })
  }),
}
