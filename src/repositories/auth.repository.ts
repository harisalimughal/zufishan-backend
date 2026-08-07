import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'

export const authRepository = {
  findUserByEmail: (email: string, select?: Prisma.UserSelect) => {
    return prisma.user.findUnique({
      where: { email },
      select,
    })
  },

  findUserById: (id: string, select?: Prisma.UserSelect) => {
    return prisma.user.findUnique({
      where: { id },
      select,
    })
  },

  createUser: (data: {
    email: string
    passwordHash: string
    fullName: string
    role?: 'STUDENT' | 'TUTOR' | 'ADMIN'
  }) => {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role || 'STUDENT',
      },
    })
  },

  updateUser: (id: string, data: { passwordHash?: string; fullName?: string; bio?: string; avatarUrl?: string }) => {
    return prisma.user.update({
      where: { id },
      data,
    })
  },

  createRefreshToken: (data: { token: string; userId: string; expiresAt: Date }) => {
    return prisma.refreshToken.create({
      data: {
        token: data.token,
        expiresAt: data.expiresAt,
        user: {
          connect: { id: data.userId }
        }
      }
    })
  },

  findRefreshToken: (token: string) => {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    })
  },

  deleteRefreshToken: (token: string) => {
    return prisma.refreshToken.delete({
      where: { token },
    })
  },

  deleteAllRefreshTokens: (userId: string) => {
    return prisma.refreshToken.deleteMany({
      where: { userId },
    })
  },

  createActivityLog: (data: { userId: string; title: string; type: string }) => {
    return prisma.activityLog.create({
      data: {
        userId: data.userId,
        title: data.title,
        type: data.type as any,
      }
    })
  },
}

export type AuthRepository = typeof authRepository