import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { achievementController } from '../controllers/achievement.controller'

const router = Router()

router.use(authenticate)

router.get('/', achievementController.getAllAchievements)
router.get('/feed', achievementController.getActivityFeed)
router.get('/activity-feed', achievementController.getActivityFeed)
router.post('/check', achievementController.checkAchievements)

export default router