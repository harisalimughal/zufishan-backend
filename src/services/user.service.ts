// user.service.ts — business logic for the "user" module: validation rules,
// orchestration across multiple repositories, decisions (e.g. "can this
// user be deleted?"). Called by controllers, calls repositories. Should be
// framework-agnostic — no `req`/`res` here.
//
// TODO:
// - export async function listUsers() {...}
// - export async function getUserById(id: string) {...}
// - export async function createUser(input: ...) {...}
// - export async function updateUser(id: string, input: ...) {...}
// - export async function deleteUser(id: string) {...}
import { userRepository } from '../repositories/user.repository'
import { ApiError } from '../utils/apiError'
import { hashPassword, comparePassword } from '../utils/password'
import { achievementService } from './achievement.service'

export const userService = {
  getProfile: async (userId: string) => {
    const user = await userRepository.getProfileWithStats(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }
    return user
  },

  updateProfile: async (userId: string, data: { fullName?: string; email?: string; bio?: string; avatarUrl?: string }) => {
    const user = await userRepository.update(userId, data)
    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  },

  updatePreferences: async (userId: string, data: { theme?: string; language?: string; notificationsEnabled?: boolean }) => {
    const preferences = await userRepository.upsertPreferences(userId, data)
    return preferences
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect')
    }

    const hashedPassword = await hashPassword(newPassword)
    await userRepository.update(userId, { passwordHash: hashedPassword })

    // Log activity
    await achievementService.logActivity(userId, 'Password changed', 'LESSON_COMPLETE')
  },
}

export type UserService = typeof userService