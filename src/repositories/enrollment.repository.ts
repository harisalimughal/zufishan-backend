import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'

export const enrollmentRepository = {
  findMany: (where: Prisma.EnrollmentWhereInput, include?: Prisma.EnrollmentInclude) => {
    return prisma.enrollment.findMany({
      where,
      include,
      orderBy: { updatedAt: 'desc' },
    })
  },

  count: (where: Prisma.EnrollmentWhereInput) => {
    return prisma.enrollment.count({ where })
  },

  findUnique: (userId: string, courseId: string) => {
    return prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })
  },

  create: (data: Prisma.EnrollmentCreateInput) => {
    return prisma.enrollment.create({ data })
  },

  update: (userId: string, courseId: string, data: Prisma.EnrollmentUpdateInput) => {
    return prisma.enrollment.update({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      data,
    })
  },

  getProgressSummary: (userId: string) => {
    return prisma.enrollment.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    })
  },

  getAverageProgress: (userId: string) => {
    return prisma.enrollment.aggregate({
      where: { userId },
      _avg: { progressPercent: true },
    })
  },

  getRecentEnrollments: (userId: string, limit: number = 5) => {
    return prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  },
}

export type EnrollmentRepository = typeof enrollmentRepository