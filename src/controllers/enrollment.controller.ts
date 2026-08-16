import { Request, Response } from 'express'
import { enrollmentService } from '../services/enrollment.service'
import { asyncHandler } from '../utils/asyncHandler'

export const enrollmentController = {
  getMyEnrollments: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { status } = req.query
    const result = await enrollmentService.getMyEnrollments(userId, status as string)
    res.status(200).json({ success: true, data: result })
  }),

  enrollInCourse: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { courseId } = req.params
    const enrollment = await enrollmentService.enrollInCourse(userId, courseId)
    res.status(201).json({ success: true, message: 'Successfully enrolled in course', data: enrollment })
  }),

  updateProgress: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { courseId } = req.params
    const { progressPercent } = req.body
    const enrollment = await enrollmentService.updateProgress(userId, courseId, progressPercent)
    res.status(200).json({ success: true, message: 'Progress updated successfully', data: enrollment })
  }),

  getProgressSummary: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const summary = await enrollmentService.getProgressSummary(userId)
    res.status(200).json({ success: true, data: summary })
  }),
}