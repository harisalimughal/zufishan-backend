import { Request, Response } from 'express'
import { achievementService } from '../services/achievement.service'
import { asyncHandler } from '../utils/asyncHandler'

export const achievementController = {
  getAllAchievements: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const result = await achievementService.getAllAchievements(userId)
    res.status(200).json({ success: true, data: result })
  }),

  getActivityFeed: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { limit = 20, offset = 0 } = req.query
    const result = await achievementService.getActivityFeed(
      userId,
      Number(limit),
      Number(offset)
    )
    res.status(200).json({ success: true, data: result })
  }),

  checkAchievements: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const result = await achievementService.checkAndAwardAchievements(userId)
    res.status(200).json({
      success: true,
      message: result.newlyUnlocked.length > 0
        ? `${result.newlyUnlocked.length} new achievements unlocked`
        : 'No new achievements',
      data: result,
    })
  }),
}