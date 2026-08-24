import { ApiError } from '../utils/apiError'
import type { HijriDateQuery } from '../validators/utility.validator'

/**
 * Hijri Date Service
 *
 * Feature logic to be implemented:
 * - Convert a Gregorian date to the Islamic Hijri calendar date
 * - Integration: AlAdhan API  GET /v1/gToH?date=DD-MM-YYYY
 *   OR use a local library (hijri-js, moment-hijri) for offline computation
 * - Returns: { hijri: { day, month, year, monthName }, gregorian: { day, month, year } }
 */
export const hijriDateService = {
  convertToHijri: async (_query: HijriDateQuery): Promise<Record<string, unknown>> => {
    // TODO: call AlAdhan gToH endpoint or local hijri lib
    throw ApiError.internal('Hijri date conversion feature is not yet implemented')
  },
}
