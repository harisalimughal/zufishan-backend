// user.controller.ts — HTTP layer only: read req (params/query/body), call
// the matching service, shape the res (status code + JSON). No business
// logic and no direct Prisma/DB access here — that belongs in the service
// and repository layers.
//
// TODO:
// - export const listUsers = asyncHandler(async (req, res) => {...});
// - export const getUser = asyncHandler(async (req, res) => {...});
// - export const createUser = asyncHandler(async (req, res) => {...});
// - export const updateUser = asyncHandler(async (req, res) => {...});
// - export const deleteUser = asyncHandler(async (req, res) => {...});
import { Request, Response } from 'express'
import { userService } from '../services/user.service'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/apiError'

export const userController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const user = await userService.getProfile(userId)
    res.status(200).json({ success: true, data: user })
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { fullName, email, bio, avatarUrl } = req.body
    const user = await userService.updateProfile(userId, { fullName, email, bio, avatarUrl })
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: user })
  }),

  updatePreferences: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { theme, language, notificationsEnabled } = req.body
    const preferences = await userService.updatePreferences(userId, { theme, language, notificationsEnabled })
    res.status(200).json({ success: true, message: 'Preferences updated successfully', data: preferences })
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { currentPassword, newPassword } = req.body
    await userService.changePassword(userId, currentPassword, newPassword)
    res.status(200).json({ success: true, message: 'Password changed successfully' })
  }),
}