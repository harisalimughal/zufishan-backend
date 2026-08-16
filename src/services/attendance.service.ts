import { attendanceRepository } from '../repositories/attendance.repository'
import { courseRepository } from '../repositories/course.repository'
import { ApiError } from '../utils/apiError'
import { achievementService } from './achievement.service'

export const attendanceService = {
  getCourseAttendance: async (userId: string, courseId: string, startDate?: string, endDate?: string) => {
    const where: any = { userId, courseId }

    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate) }
    }

    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) }
    }

    const [records, total, present, absent, leave] = await Promise.all([
      attendanceRepository.findMany(where),
      attendanceRepository.count(where),
      attendanceRepository.count({ ...where, status: 'PRESENT' }),
      attendanceRepository.count({ ...where, status: 'ABSENT' }),
      attendanceRepository.count({ ...where, status: 'LEAVE' }),
    ])

    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0

    return {
      records,
      stats: { total, present, absent, leave, attendanceRate },
    }
  },

  markAttendance: async (userId: string, courseId: string, status: string, timeSlot?: string, topic?: string) => {
    const course = await courseRepository.findById(courseId)
    if (!course) {
      throw ApiError.notFound('Course not found')
    }

    // Check if already marked for today
    const existing = await attendanceRepository.findToday(userId, courseId)
    if (existing) {
      throw ApiError.conflict('Attendance already marked for today')
    }

    const attendance = await attendanceRepository.create({
      userId,
      courseId,
      status: status as any,
      timeSlot,
      topic,
      date: new Date(),
    })

    // Update streak
    await updateUserStreak(userId)

    // Log activity if present
    if (status === 'PRESENT') {
      await achievementService.logActivity(userId, `Attended ${course.title} class`, 'LESSON_COMPLETE')
    }

    return attendance
  },

  getStreak: async (userId: string) => {
    const streak = await attendanceRepository.getStreak(userId)
    return streak || { currentStreak: 0, bestStreak: 0, lastActiveDate: null }
  },
}

// Helper function to update user streak
async function updateUserStreak(userId: string) {
  const streak = await attendanceRepository.getStreak(userId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!streak) {
    await attendanceRepository.upsertStreak(userId, {
      currentStreak: 1,
      bestStreak: 1,
      lastActiveDate: today,
    })
    return
  }

  const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let currentStreak = streak.currentStreak
  let bestStreak = streak.bestStreak

  if (!lastActive || lastActive < yesterday) {
    currentStreak = 1
  } else if (lastActive >= today) {
    return
  } else {
    currentStreak += 1
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak
    }
  }

  await attendanceRepository.upsertStreak(userId, {
    currentStreak,
    bestStreak,
    lastActiveDate: today,
  })
}

export type AttendanceService = typeof attendanceService