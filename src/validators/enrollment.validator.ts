import { z } from 'zod'

export const enrollCourseSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
})

export const updateProgressSchema = z.object({
  progressPercent: z.number().min(0).max(100, 'Progress must be between 0 and 100'),
})

export const getEnrollmentsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED']).optional(),
  page: z.string().optional().transform(Number),
  limit: z.string().optional().transform(Number),
})

export type EnrollCourseInput = z.infer<typeof enrollCourseSchema>
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsQuerySchema>