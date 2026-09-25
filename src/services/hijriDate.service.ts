/**
 * Hijri Date Service
 *
 * Coordinates input validation, location-based Hijri conversion (via isolated hijriConverter),
 * and Islamic events lookup (via islamicEventsEngine).
 */

import { ApiError } from '../utils/apiError'
import { hijriConverter, type HijriDateResult } from './hijriConverter'
import { islamicEventsEngine, type IslamicEventDef, type NearbyEvent } from './islamicEvents'
import type { HijriDateQuery } from '../validators/utility.validator'

export interface GregorianResult {
  date: string        // YYYY-MM-DD
  day: number
  month: number
  year: number
  weekday: string
  formatted: string
}

export interface HijriDateResponseData {
  gregorian: GregorianResult
  hijri: HijriDateResult
  location?: {
    latitude?: number
    longitude?: number
    adjustment: number
    regionNote?: string
  }
  currentEvent: IslamicEventDef | null
  monthEvents: NearbyEvent[]
  nearbyEvents: NearbyEvent[]
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES_GREGORIAN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Parse date string into UTC Date object safely to avoid timezone boundary shifts.
 */
export function parseDateInput(dateStr?: string): Date {
  if (!dateStr) {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  }

  // Check YYYY-MM-DD format
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch.map(Number)
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      throw ApiError.badRequest('Invalid date: month must be 1-12 and day 1-31')
    }
    return new Date(Date.UTC(y, m - 1, d))
  }

  // Check DD-MM-YYYY format
  const dmyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch.map(Number)
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      throw ApiError.badRequest('Invalid date: month must be 1-12 and day 1-31')
    }
    return new Date(Date.UTC(y, m - 1, d))
  }

  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) {
    throw ApiError.badRequest('date must be a valid date string (e.g. YYYY-MM-DD)')
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

export const hijriDateService = {
  /**
   * GET /api/v1/utilities/hijri-date?date=&latitude=&longitude=&adjustment=
   */
  convertToHijri: async (query: HijriDateQuery): Promise<HijriDateResponseData> => {
    const { date: dateStr, latitude, longitude, adjustment } = query

    const targetDate = parseDateInput(dateStr)

    // Perform conversion using isolated converter
    const hijriResult = await hijriConverter.convert(targetDate, {
      latitude,
      longitude,
      adjustment,
    })

    // Gregorian details
    const gYear = targetDate.getUTCFullYear()
    const gMonth = targetDate.getUTCMonth() + 1
    const gDay = targetDate.getUTCDate()
    const weekday = WEEKDAYS[targetDate.getUTCDay()] ?? 'Wednesday'
    const monthName = MONTH_NAMES_GREGORIAN[gMonth - 1] ?? ''

    const gregorian: GregorianResult = {
      date: `${gYear}-${String(gMonth).padStart(2, '0')}-${String(gDay).padStart(2, '0')}`,
      day: gDay,
      month: gMonth,
      year: gYear,
      weekday,
      formatted: `${weekday}, ${gDay} ${monthName} ${gYear}`,
    }

    // Islamic events
    const currentEvent = islamicEventsEngine.getCurrentEvent(hijriResult.day, hijriResult.month.number)
    const monthEvents = islamicEventsEngine.getMonthEvents(hijriResult.month.number, hijriResult.year)
    const nearbyEvents = islamicEventsEngine.getNearbyEvents(
      hijriResult.day,
      hijriResult.month.number,
      hijriResult.year,
      10
    )

    let regionNote = 'Standard Umm Al-Qura / Global calculation'
    if (latitude !== undefined && longitude !== undefined) {
      if (latitude >= 5 && latitude <= 37 && longitude >= 60 && longitude <= 95) {
        regionNote = 'South Asia regional moon sighting offset applied (-1 day)'
      }
    }
    if (adjustment !== undefined) {
      regionNote = `Explicit day adjustment applied (${adjustment > 0 ? '+' : ''}${adjustment} day)`
    }

    return {
      gregorian,
      hijri: hijriResult,
      location: {
        latitude,
        longitude,
        adjustment: hijriResult.effectiveAdjustment,
        regionNote,
      },
      currentEvent,
      monthEvents,
      nearbyEvents,
    }
  },
}
