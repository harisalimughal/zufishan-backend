import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { enrollmentController } from '../controllers/enrollment.controller'
import { validate } from '../middlewares/validate.middleware'
import { updateProgressSchema, enrollCourseSchema } from '../validators/enrollment.validator'

const router = Router()

router.use(authenticate)

router.get('/', enrollmentController.getMyEnrollments)
router.get('/progress/summary', enrollmentController.getProgressSummary)
router.post('/courses/:courseId', validate(enrollCourseSchema, 'params'), enrollmentController.enrollInCourse)
router.patch('/courses/:courseId/progress', validate(updateProgressSchema), enrollmentController.updateProgress)

export default router