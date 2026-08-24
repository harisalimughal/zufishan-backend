

import { ApiError } from '../utils/apiError'
import type { PrayerTimesQuery } from '../validators/utility.validator'

/**
 * Prayer Times Service
 *
 * Feature logic to be implemented:
 * - Fetch 5 daily prayer times based on lat/lng + calculation method
 * - Integration: AlAdhan API (free, no key required) or local calculation lib (adhan-js)
 * - Caching: consider caching by (lat, lng, date, method) to reduce external calls
 */
export const prayerTimesService = {
  getPrayerTimes: async (_query: PrayerTimesQuery): Promise<Record<string, unknown>> => {
    // TODO: call AlAdhan API or use adhan-js computation library
    // Example endpoint: GET https://api.aladhan.com/v1/timings?latitude=...&longitude=...&method=2
    throw ApiError.internal('Prayer times feature is not yet implemented')
  },
}
