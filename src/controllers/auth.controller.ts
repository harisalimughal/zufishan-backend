import { Request, Response } from 'express'
import { authService } from '../services/auth.service'
import { asyncHandler } from '../utils/asyncHandler'
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator'

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = registerSchema.parse(req.body)
    const result = await authService.register(validatedData)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    })
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = loginSchema.parse(req.body)
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip
    const userAgent = req.headers['user-agent']
    const result = await authService.login(
      validatedData.email,
      validatedData.password,
      ipAddress,
      userAgent
    )
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    })
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = refreshTokenSchema.parse(req.body)
    const tokens = await authService.refreshToken(validatedData.refreshToken)
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    })
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const { refreshToken } = req.body
    if (!refreshToken) {
      throw new Error('Refresh token is required')
    }
    await authService.logout(userId, refreshToken)
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    })
  }),

  getMe: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const user = await authService.getProfile(userId)
    res.status(200).json({
      success: true,
      data: user,
    })
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const validatedData = changePasswordSchema.parse(req.body)
    await authService.changePassword(
      userId,
      validatedData.currentPassword,
      validatedData.newPassword
    )
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    })
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = forgotPasswordSchema.parse(req.body)
    await authService.forgotPassword(validatedData.email)
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
    })
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = resetPasswordSchema.parse(req.body)
    await authService.resetPassword(validatedData.token, validatedData.newPassword)
    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    })
  }),
}