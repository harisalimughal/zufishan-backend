/**
 * Isolated Hijri Converter Engine
 *
 * Provides a clean interface for converting Gregorian dates to Hijri dates.
 * Features:
 *  - Primary: AlAdhan API gToH endpoint
 *  - Fallback: Local pure-math Tabular Hijri calculation algorithm (Kuwaiti algorithm)
 *  - Location-based moon sighting trace (e.g. Pakistan -1 day vs Saudi Arabia 0)
 *  - Explicit day adjustment support (-3 to +3 days)
 */

import fetch from 'node-fetch'
import { logger } from '../utils/logger'

export interface HijriDateResult {
  day: number
  month: {
    number: number
    en: string
    ar: string
  }
  year: number
  designation: string
  formatted: string
  provider: 'aladhan' | 'local_tabular'
  effectiveAdjustment: number
}

export interface ConversionOptions {
  latitude?: number
  longitude?: number
  adjustment?: number
}

/**
 * Determine regional moon-sighting adjustment based on geographic coordinates.
 * South Asia (Pakistan, India, Bangladesh) frequently sights the moon 1 day after Saudi Arabia.
 */
export function resolveRegionalAdjustment(options?: ConversionOptions): number {
  if (options?.adjustment !== undefined && options?.adjustment !== null) {
    return options.adjustment
  }

  const { latitude, longitude } = options ?? {}
  if (latitude !== undefined && longitude !== undefined) {
    // South Asia region check (Pakistan: 23-37°N, 60-77°E; India/Bangladesh up to 95°E)
    const isSouthAsia = latitude >= 5 && latitude <= 37 && longitude >= 60 && longitude <= 95
    if (isSouthAsia) {
      return -1 // South Asia moon-sighting adjustment offset relative to Umm Al-Qura
    }
  }

  return 0
}

/**
 * Fallback Tabular Hijri Algorithm (Kuwaiti algorithm modified with day adjustment)
 */
export function calculateLocalTabularHijri(date: Date, adjustment = 0): HijriDateResult {
  const adjustedDate = new Date(date.getTime())
  adjustedDate.setUTCDate(adjustedDate.getUTCDate() + adjustment)

  const day = adjustedDate.getUTCDate()
  const month = adjustedDate.getUTCMonth() + 1 // 1-indexed
  const year = adjustedDate.getUTCFullYear()

  // Julian Day Number calculation
  let m = month
  let y = year
  if (m < 3) {
    y -= 1
    m += 12
  }

  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5

  // Convert Julian Day Number to Tabular Hijri
  const z = jd - 1948439.5
  const cyc = Math.floor(z / 10631)
  const rem = z - cyc * 10631

  const iy = Math.floor((rem - 0.125) / 354.366)
  const hYear = cyc * 30 + iy + 1
  const daysInYear = Math.floor(iy * 354.366 + 0.125)

  let hDay = Math.floor(rem - daysInYear + 1)
  let hMonth = Math.floor((hDay - 0.5) / 29.5) + 1
  if (hMonth > 12) hMonth = 12

  const monthStartDays = [0, 30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325]
  hDay = Math.floor(rem - daysInYear - (monthStartDays[hMonth - 1] ?? 0)) + 1

  if (hDay < 1) hDay = 1
  if (hDay > 30) hDay = 30

  const MONTH_NAMES_EN = [
    'Muharram', 'Safar', 'Rabi\' al-Awwal', 'Rabi\' al-Thani',
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah',
  ]

  const MONTH_NAMES_AR = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
  ]

  const monthEn = MONTH_NAMES_EN[hMonth - 1] ?? 'Hijri Month'
  const monthAr = MONTH_NAMES_AR[hMonth - 1] ?? 'شهر هجري'

  return {
    day: hDay,
    month: {
      number: hMonth,
      en: monthEn,
      ar: monthAr,
    },
    year: hYear,
    designation: 'AH',
    formatted: `${hDay} ${monthEn} ${hYear} AH`,
    provider: 'local_tabular',
    effectiveAdjustment: adjustment,
  }
}

/**
 * Isolated Hijri Converter Engine implementation
 */
export const hijriConverter = {
  async convert(date: Date, options?: ConversionOptions): Promise<HijriDateResult> {
    const effectiveAdjustment = resolveRegionalAdjustment(options)

    // Format date as DD-MM-YYYY for AlAdhan API
    const d = String(date.getUTCDate()).padStart(2, '0')
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const y = date.getUTCFullYear()
    const formattedDDMMYYYY = `${d}-${m}-${y}`

    try {
      const url = `https://api.aladhan.com/v1/gToH/${formattedDDMMYYYY}?adjustment=${effectiveAdjustment}`
      const response = await fetch(url, { timeout: 5000 } as any)

      if (response.ok) {
        const json = (await response.json()) as any
        if (json?.code === 200 && json?.data?.hijri) {
          const h = json.data.hijri
          const day = parseInt(h.day, 10)
          const monthNum = parseInt(h.month.number, 10)
          const year = parseInt(h.year, 10)

          return {
            day,
            month: {
              number: monthNum,
              en: h.month.en,
              ar: h.month.ar,
            },
            year,
            designation: h.designation?.abbreviation ?? 'AH',
            formatted: `${day} ${h.month.en} ${year} AH`,
            provider: 'aladhan',
            effectiveAdjustment,
          }
        }
      }
    } catch (err) {
      logger.warn(`AlAdhan gToH API unreachable (${(err as Error).message}), using local tabular fallback`)
    }

    // Fallback to local pure-math Tabular calculation algorithm
    return calculateLocalTabularHijri(date, effectiveAdjustment)
  },
}
