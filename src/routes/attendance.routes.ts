import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { attendanceController } from '../controllers/attendance.controller'
import { validate } from '../middlewares/validate.middleware'
import { markAttendanceSchema } from '../validators/attendance.validator'

const router = Router()

router.use(authenticate)

router.get('/streak', attendanceController.getStreak)
router.get('/courses/:courseId', attendanceController.getCourseAttendance)
router.post('/', validate(markAttendanceSchema), attendanceController.markAttendance)

export default router