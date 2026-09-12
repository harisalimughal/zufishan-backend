import { Router } from 'express'
import prayerTimesRoutes from './prayerTimes.routes'
import qiblaRoutes from './qibla.routes'
import hijriDateRoutes from './hijriDate.routes'
import zakatRoutes from './zakat.routes'
import azkarRoutes from './azkar.routes'
import tasbihRoutes from './tasbih.routes'
import aiAssistantRoutes from './aiAssistant.routes'

/**
 * Utilities Sub-Router
 *
 * Mounted at: /api/v1/utilities  (registered in src/app.ts)
 *
 * Route map:
 *   GET  /api/v1/utilities/prayer-times              → prayerTimes.routes.ts
 *   GET  /api/v1/utilities/qibla                     → qibla.routes.ts
 *   GET  /api/v1/utilities/hijri-date                → hijriDate.routes.ts
 *   POST /api/v1/utilities/zakat/calculate           → zakat.routes.ts
 *   GET  /api/v1/utilities/azkar                     → azkar.routes.ts
 *   POST /api/v1/utilities/tasbih/sessions    [auth] → tasbih.routes.ts
 *   GET  /api/v1/utilities/tasbih/sessions    [auth] → tasbih.routes.ts
 *   POST /api/v1/utilities/ai-assistant/message [auth] → aiAssistant.routes.ts
 *   GET  /api/v1/utilities/ai-assistant/conversations [auth] → aiAssistant.routes.ts
 *   GET  /api/v1/utilities/ai-assistant/conversations/:id [auth] → aiAssistant.routes.ts
 */
const router = Router()

router.use('/prayer-times', prayerTimesRoutes)
router.use('/qibla', qiblaRoutes)
router.use('/hijri-date', hijriDateRoutes)
router.use('/zakat', zakatRoutes)
router.use('/azkar', azkarRoutes)
router.use('/tasbih', tasbihRoutes)
router.use('/ai-assistant', aiAssistantRoutes)

// Alias for Prompt 7 roadmap endpoint: /api/v1/utilities/admin/ai-assistant/*
router.use('/admin/ai-assistant', (req, res, next) => {
  req.url = '/admin' + req.url
  return aiAssistantRoutes(req, res, next)
})

export default router

