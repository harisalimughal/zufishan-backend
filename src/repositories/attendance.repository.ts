import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'

export const attendanceRepository = {
  findMany: (where: Prisma.AttendanceLogWhereInput) => {
    return prisma.attendanceLog.findMany({
      where,
      orderBy: { date: 'desc' },
    })
  },

  count: (where: Prisma.AttendanceLogWhereInput) => {
    return prisma.attendanceLog.count({ where })
  },

  findToday: (userId: string, courseId: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return prisma.attendanceLog.findFirst({
      where: {
        userId,
        courseId,
        date: { gte: today },
      },
    })
  },

  create: (data: Prisma.AttendanceLogCreateInput) => {
    return prisma.attendanceLog.create({ data })
  },

  getStreak: (userId: string) => {
    return prisma.userStreak.findUnique({
      where: { userId },
    })
  },

  upsertStreak: (userId: string, data: { currentStreak: number; bestStreak: number; lastActiveDate: Date }) => {
    return prisma.userStreak.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
  },

  getAttendanceStats: (userId: string, courseId: string) => {
    const where = { userId, courseId }
    return Promise.all([
      prisma.attendanceLog.count({ where }),
      prisma.attendanceLog.count({ where: { ...where, status: 'PRESENT' } }),
      prisma.attendanceLog.count({ where: { ...where, status: 'ABSENT' } }),
      prisma.attendanceLog.count({ where: { ...where, status: 'LEAVE' } }),
    ])
  },
}

export type AttendanceRepository = typeof attendanceRepository