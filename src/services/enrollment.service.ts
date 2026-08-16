import { enrollmentRepository } from '../repositories/enrollment.repository'
import { courseRepository } from '../repositories/course.repository'
import { ApiError } from '../utils/apiError'
import { achievementService } from './achievement.service'

export const enrollmentService = {
  getMyEnrollments: async (userId: string, status?: string) => {
    const where: any = { userId }
    if (status) {
      where.status = status
    }

    const [enrollments, total] = await Promise.all([
      enrollmentRepository.findMany(where, {
        course: {
          select: {
            id: true,
            title: true,
            detailSlug: true,
            description: true,
            instructorName: true,
            category: true,
            level: true,
            icon: true,
            rating: true,
            totalStudents: true,
          },
        },
      }),
      enrollmentRepository.count(where),
    ])

    return { enrollments, total }
  },

  enrollInCourse: async (userId: string, courseId: string) => {
    // Check if course exists
    const course = await courseRepository.findById(courseId)
    if (!course) {
      throw ApiError.notFound('Course not found')
    }

    // Check if already enrolled
    const existing = await enrollmentRepository.findUnique(userId, courseId)
    if (existing) {
      throw ApiError.conflict('Already enrolled in this course')
    }

    // Create enrollment
    const enrollment = await enrollmentRepository.create({
      userId,
      courseId,
      status: 'ACTIVE',
    })

    // Update course total students
    await courseRepository.incrementStudents(courseId)

    // Log activity
    await achievementService.logActivity(userId, `Enrolled in ${course.title}`, 'LESSON_COMPLETE')

    return enrollment
  },

  updateProgress: async (userId: string, courseId: string, progressPercent: number) => {
    const enrollment = await enrollmentRepository.findUnique(userId, courseId)
    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found')
    }

    const updated = await enrollmentRepository.update(userId, courseId, {
      progressPercent,
      status: progressPercent === 100 ? 'COMPLETED' : 'ACTIVE',
      updatedAt: new Date(),
    })

    // If completed, log achievement
    if (progressPercent === 100) {
      await achievementService.logActivity(userId, `Completed ${updated.course?.title || 'course'}`, 'LESSON_COMPLETE')
    }

    return updated
  },

  getProgressSummary: async (userId: string) => {
    const [statusCounts, avgProgress, recentEnrollments] = await Promise.all([
      enrollmentRepository.getProgressSummary(userId),
      enrollmentRepository.getAverageProgress(userId),
      enrollmentRepository.getRecentEnrollments(userId),
    ])

    const summary = {
      totalEnrollments: 0,
      completed: 0,
      inProgress: 0,
      dropped: 0,
      averageProgress: Math.round(avgProgress._avg.progressPercent || 0),
    }

    statusCounts.forEach((item) => {
      summary.totalEnrollments += item._count
      summary[item.status.toLowerCase() as keyof typeof summary] = item._count
    })

    return { summary, recentEnrollments }
  },
}

export type EnrollmentService = typeof enrollmentService