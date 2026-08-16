import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'

export const achievementRepository = {
  findAll: () => {
    return prisma.achievement.findMany({
      orderBy: { createdAt: 'asc' },
    })
  },

  findWithUserProgress: (userId: string) => {
    return prisma.achievement.findMany({
      include: {
        users: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  },

  findUserAchievements: (userId: string) => {
    return prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
  },

  unlockAchievement: (userId: string, achievementId: string) => {
    return prisma.userAchievement.create({
      data: {
        userId,
        achievementId,
      },
    })
  },

  getActivityFeed: (userId: string, limit: number = 20, offset: number = 0) => {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  },

  countActivityFeed: (userId: string) => {
    return prisma.activityLog.count({ where: { userId } })
  },

  createActivityLog: (data: Prisma.ActivityLogCreateInput) => {
    return prisma.activityLog.create({ data })
  },

  getUnlockedCount: (userId: string) => {
    return prisma.userAchievement.count({ where: { userId } })
  },
}

export type AchievementRepository = typeof achievementRepository