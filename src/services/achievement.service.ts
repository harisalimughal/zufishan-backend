import { achievementRepository } from '../repositories/achievement.repository'
import { ApiError } from '../utils/apiError'

export const achievementService = {
  getAllAchievements: async (userId: string) => {
    const achievements = await achievementRepository.findWithUserProgress(userId)

    const formatted = achievements.map((achievement: any) => ({
      ...achievement,
      isUnlocked: achievement.users.length > 0,
      unlockedAt: achievement.users[0]?.unlockedAt || null,
    }))

    const unlocked = formatted.filter((a: any) => a.isUnlocked).length
    const total = formatted.length

    return {
      achievements: formatted,
      stats: {
        unlocked,
        total,
        progress: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      },
    }
  },

  getActivityFeed: async (userId: string, limit: number = 20, offset: number = 0) => {
    const [activities, total] = await Promise.all([
      achievementRepository.getActivityFeed(userId, limit, offset),
      achievementRepository.countActivityFeed(userId),
    ])

    return {
      activities,
      pagination: { total, limit, offset },
    }
  },

  checkAndAwardAchievements: async (userId: string) => {
    const [allAchievements, userAchievements, enrollments, attendanceLogs, submissions] = await Promise.all([
      achievementRepository.findAll(),
      achievementRepository.findUserAchievements(userId),
      // These should come from repositories
      // For now, using placeholder values
      // In production, inject these from respective repositories
    ])

    const unlockedIds = new Set(userAchievements.map((a: any) => a.achievementId))
    const newlyUnlocked: any[] = []

    // Check each achievement
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue

      let shouldUnlock = false

      switch (achievement.title) {
        case 'First Steps':
          shouldUnlock = enrollments >= 1
          break
        case 'Quick Learner':
          shouldUnlock = enrollments >= 5
          break
        case 'Perfect Attendance':
          shouldUnlock = attendanceLogs >= 10
          break
        case 'Assignment Master':
          shouldUnlock = submissions >= 20
          break
        default:
          shouldUnlock = false
      }

      if (shouldUnlock) {
        await achievementRepository.unlockAchievement(userId, achievement.id)
        await achievementService.logActivity(
          userId,
          `🏆 Achievement Unlocked: ${achievement.title}`,
          'BADGE_EARNED'
        )
        newlyUnlocked.push(achievement)
      }
    }

    return {
      newlyUnlocked,
      totalUnlocked: unlockedIds.size + newlyUnlocked.length,
    }
  },

  logActivity: async (userId: string, title: string, type: string, subtitle?: string) => {
    return achievementRepository.createActivityLog({
      userId,
      title,
      subtitle,
      type: type as any,
    })
  },
}

export type AchievementService = typeof achievementService