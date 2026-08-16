import { Request, Response } from 'express'
import { attendanceService } from '../services/attendance.service'
import { asyncHandler } from '../utils/asyncHandler'

export const attendanceController = {
  getCourseAttendance: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { courseId } = req.params
    const { startDate, endDate } = req.query
    const result = await attendanceService.getCourseAttendance(
      userId,
      courseId,
      startDate as string,
      endDate as string
    )
    res.status(200).json({ success: true, data: result })
  }),

  markAttendance: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const { courseId, status, timeSlot, topic } = req.body
    const attendance = await attendanceService.markAttendance(userId, courseId, status, timeSlot, topic)
    res.status(201).json({ success: true, message: 'Attendance marked successfully', data: attendance })
  }),

  getStreak: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id
    const streak = await attendanceService.getStreak(userId)
    res.status(200).json({ success: true, data: streak })
  }),
}