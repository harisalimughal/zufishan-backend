import { authRepository } from '../repositories/auth.repository'
import { ApiError } from '../utils/apiError'
import { comparePassword, hashPassword } from '../utils/password'
import { generateToken, generateRefreshToken, verifyRefreshToken, generateTokenWithExpiry } from '../utils/jwt'

// Activity types enum (matching Prisma schema)
const ActivityType = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
} as const

export const authService = {
  /**
   * Register a new user
   */
  register: async (input: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) => {
    const existingUser = await authRepository.findUserByEmail(input.email)
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists')
    }

    const hashedPassword = await hashPassword(input.password)

    const user = await authRepository.createUser({
      email: input.email,
      passwordHash: hashedPassword,
      fullName: `${input.firstName} ${input.lastName}`,
      role: 'STUDENT',
    })

    const { passwordHash, ...userWithoutPassword } = user
    return { user: userWithoutPassword }
  },

  /**
   * Login user
   */
  login: async (email: string, password: string, ipAddress?: string, userAgent?: string) => {
    const user = await authRepository.findUserByEmail(email)
    if (!user) {
      throw ApiError.unauthorized('Invalid credentials')
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash)
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials')
    }

    const payload = { id: user.id, email: user.email, role: user.role }
    const accessToken = generateToken(payload)
    const refreshToken = generateRefreshToken(payload)

    await authRepository.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    await authRepository.createActivityLog({
      userId: user.id,
      title: `User ${user.email} logged in`,
      type: ActivityType.LOGIN,
    })

    const { passwordHash, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      tokens: { accessToken, refreshToken },
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string) => {
    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded) {
      throw ApiError.unauthorized('Invalid refresh token')
    }

    const storedToken = await authRepository.findRefreshToken(refreshToken)
    if (!storedToken) {
      throw ApiError.unauthorized('Invalid refresh token')
    }

    if (storedToken.expiresAt < new Date()) {
      await authRepository.deleteRefreshToken(refreshToken)
      throw ApiError.unauthorized('Refresh token expired')
    }

    const user = await authRepository.findUserById(storedToken.userId)
    if (!user) {
      throw ApiError.unauthorized('User not found')
    }

    const payload = { id: user.id, email: user.email, role: user.role }
    const newAccessToken = generateToken(payload)
    const newRefreshToken = generateRefreshToken(payload)

    await authRepository.deleteRefreshToken(refreshToken)

    await authRepository.createRefreshToken({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    await authRepository.createActivityLog({
      userId: user.id,
      title: `Token refreshed for user ${user.email}`,
      type: ActivityType.TOKEN_REFRESH,
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  },

  /**
   * Logout user
   */
  logout: async (userId: string, refreshToken: string) => {
    await authRepository.deleteRefreshToken(refreshToken)

    await authRepository.createActivityLog({
      userId,
      title: 'User logged out',
      type: ActivityType.LOGOUT,
    })
  },

  /**
   * Get user profile
   */
  getProfile: async (userId: string) => {
    const user = await authRepository.findUserById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  },

  /**
   * Change password
   */
  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await authRepository.findUserById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Current password is incorrect')
    }

    const hashedPassword = await hashPassword(newPassword)

    await authRepository.updateUser(userId, {
      passwordHash: hashedPassword,
    })

    await authRepository.createActivityLog({
      userId,
      title: 'Password changed',
      type: ActivityType.PASSWORD_CHANGE,
    })
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email: string) => {
    const user = await authRepository.findUserByEmail(email)
    if (!user) {
      return
    }
    
    const resetToken = generateTokenWithExpiry(
      { id: user.id, email: user.email, role: user.role },
      '1h'
    )

    await authRepository.createActivityLog({
      userId: user.id,
      title: 'Password reset requested',
      type: ActivityType.PASSWORD_RESET_REQUEST,
    })

    return { resetToken }
  },

  /**
   * Reset password
   */
  resetPassword: async (token: string, newPassword: string) => {
    const decoded = verifyRefreshToken(token)
    if (!decoded) {
      throw ApiError.unauthorized('Invalid or expired reset token')
    }

    const user = await authRepository.findUserById(decoded.id)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    const hashedPassword = await hashPassword(newPassword)

    await authRepository.updateUser(user.id, {
      passwordHash: hashedPassword,
    })

    await authRepository.createActivityLog({
      userId: user.id,
      title: 'Password reset completed',
      type: ActivityType.PASSWORD_RESET_COMPLETE,
    })
  },
}

export type AuthService = typeof authService