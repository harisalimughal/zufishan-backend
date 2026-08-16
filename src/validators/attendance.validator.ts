import { z } from 'zod'

export const markAttendanceSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
  timeSlot: z.string().optional(),
  topic: z.string().optional(),
})

export const getAttendanceQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>
export type GetAttendanceQuery = z.infer<typeof getAttendanceQuerySchema>