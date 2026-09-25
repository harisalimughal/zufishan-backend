/**
 * Prayer Times Service
 *
 * Responsibilities:
 *  1. Validate / parse incoming query parameters
 *  2. Attempt a PostgreSQL cache hit (prayer_time_cache table)
 *  3. On cache miss → call AlAdhan API (https://api.aladhan.com/v1/timings)
 *  4. Persist the API response to the DB cache
 *  5. Return a normalised, consistent response object
 *
 * External dependency: AlAdhan (free, no API key, HTTPS)
 *   GET https://api.aladhan.com/v1/timings/{timestamp}
 *       ?latitude=&longitude=&method=&school=
 *
 * AlAdhan method numbers (method query param sent as INT):
 *   0 = Jafari   1 = Karachi   2 = ISNA   3 = MWL   4 = Makkah
 *   5 = Egypt    11 = Qatar    12 = Kuwait 13 = Singapore 15 = Tehran
 *   16 = Türkiye
 *
 * asrMethod / school:
 *   0 = Standard (Shafi'i / Maliki / Hanbali)
 *   1 = Hanafi
 */

import fetch from 'node-fetch'
import { ApiError } from '../utils/apiError'
import { logger } from '../utils/logger'
import { prayerTimesRepository } from '../repositories/prayerTimes.repository'
import type { PrayerTimesQuery } from '../validators/utility.validator'

// ─── AlAdhan method name → numeric ID mapping ────────────────────────────────

const METHOD_MAP: Record<string, number> = {
  MWL: 3,
  ISNA: 2,
  Egypt: 5,
  EGYPT: 5,
  Makkah: 4,
  MAKKAH: 4,
  Karachi: 1,
  KARACHI: 1,
  Qatar: 11,
  QATAR: 11,
  Kuwait: 12,
  KUWAIT: 12,
  Singapore: 13,
  SINGAPORE: 13,
  Tehran: 15,
  TEHRAN: 15,
  Turkey: 16,
  TURKEY: 16,
  Jafari: 0,
  JAFARI: 0,
}

function resolveMethodId(method: string): number {
  // If the caller already passed a number-string, use it directly
  const asNum = parseInt(method, 10)
  if (!isNaN(asNum) && asNum >= 0 && asNum <= 23) return asNum
  return METHOD_MAP[method] ?? 3 // default to MWL (3)
}

// ─── Response shape ───────────────────────────────────────────────────────────

export interface PrayerTimesResult {
  date: string          // YYYY-MM-DD
  hijriDate: {
    day: number
    month: { number: number; en: string; ar: string }
    year: number
  }
  method: string        // human-readable method name
  asrMethod: number     // 0 = Standard, 1 = Hanafi
  location: { latitude: number; longitude: number }
  timings: {
    Fajr: string
    Sunrise: string
    Dhuhr: string
    Asr: string
    Maghrib: string
    Isha: string
    Midnight?: string
    Lastthird?: string
  }
  meta: {
    timezone: string
    calculationMethodId: number
    cached: boolean
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip the " (X)" designation AlAdhan appends, e.g. "04:31 (Fajr)" → "04:31" */
function stripAnnotation(timeStr: string): string {
  return timeStr?.split(' ')[0]?.trim() ?? ''
}

/** Compute end-of-day UTC for a YYYY-MM-DD string (used as cache TTL) */
function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  // Set to 23:59:59 UTC of that day
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  )
}

// ─── AlAdhan API Call ─────────────────────────────────────────────────────────

const ALADHAN_TIMEOUT_MS = 8_000

interface AlAdhanResponse {
  code: number
  status: string
  data: {
    timings: Record<string, string>
    date: {
      readable: string
      timestamp: string
      hijri: {
        day: string
        month: { number: number; en: string; ar: string }
        year: string
      }
      gregorian: {
        date: string // DD-MM-YYYY
      }
    }
    meta: {
      latitude: number
      longitude: number
      timezone: string
      method: { id: number; name: string }
      latitudeAdjustmentMethod: string
      school: string   // "Shafi" | "Hanafi"
    }
  }
}

async function fetchFromAlAdhan(
  latitude: number,
  longitude: number,
  methodId: number,
  asrMethod: number,
  dateStr: string,
): Promise<AlAdhanResponse> {
  // Convert YYYY-MM-DD to DD-MM-YYYY for AlAdhan
  const [year, month, day] = dateStr.split('-')
  const ddmmyyyy = `${day}-${month}-${year}`

  const url = new URL(`https://api.aladhan.com/v1/timings/${ddmmyyyy}`)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('method', String(methodId))
  url.searchParams.set('school', String(asrMethod)) // 0=Shafi'i, 1=Hanafi

  logger.info({ url: url.toString() }, 'Calling AlAdhan API')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ALADHAN_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal as any,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw ApiError.internal(
        `AlAdhan API returned HTTP ${response.status}: ${response.statusText}`,
      )
    }

    const json = (await response.json()) as AlAdhanResponse

    if (json.code !== 200) {
      throw ApiError.internal(`AlAdhan API error: ${json.status}`)
    }

    return json
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err
    const name = (err as any)?.name
    if (name === 'AbortError') {
      throw ApiError.internal('Prayer times API request timed out. Please try again.')
    }
    throw ApiError.internal('Failed to fetch prayer times from external service.')
  } finally {
    clearTimeout(timer)
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const prayerTimesService = {
  /**
   * GET /api/v1/utilities/prayer-times
   *
   * Returns prayer times for the given coordinates + date.
   * Serves from PostgreSQL cache when possible; falls back to AlAdhan API.
   */
  getPrayerTimes: async (query: PrayerTimesQuery): Promise<PrayerTimesResult> => {
    // ── 1. Guard: coordinates must be present after Zod transform ───────────
    if (query.latitude === undefined || query.longitude === undefined) {
      throw ApiError.badRequest('latitude (or lat) and longitude (or lng) are required.')
    }

    const latitude  = query.latitude
    const longitude = query.longitude
    const method    = query.method    ?? 'MWL'
    const asrMethod = query.asrMethod ?? 0

    // ── 2. Resolve the requested date (default = today UTC) ─────────────────
    let dateStr: string
    if (query.date) {
      dateStr = query.date
    } else {
      const now = new Date()
      dateStr = now.toISOString().split('T')[0]
    }

    // ── 3. Cache lookup ─────────────────────────────────────────────────────
    try {
      const cached = await prayerTimesRepository.findCached(
        latitude, longitude, dateStr, method, asrMethod,
      )

      if (cached) {
        logger.debug({ dateStr, method, asrMethod }, 'Prayer times cache HIT')
        return {
          date: dateStr,
          hijriDate: { day: 0, month: { number: 0, en: '', ar: '' }, year: 0 }, // not stored in cache
          method,
          asrMethod,
          location: { latitude, longitude },
          timings: {
            Fajr:    cached.fajr,
            Sunrise: cached.sunrise,
            Dhuhr:   cached.dhuhr,
            Asr:     cached.asr,
            Maghrib: cached.maghrib,
            Isha:    cached.isha,
            Midnight:  cached.midnight  ?? undefined,
            Lastthird: cached.lastThird ?? undefined,
          },
          meta: {
            timezone: 'UTC (stored as HH:MM)',
            calculationMethodId: resolveMethodId(method),
            cached: true,
          },
        }
      }
    } catch (dbErr: unknown) {
      // Cache lookup failure must NOT block the user — degrade gracefully
      logger.warn({ err: dbErr }, 'Prayer times cache lookup failed; proceeding to API')
    }

    // ── 4. Cache miss → Call AlAdhan ────────────────────────────────────────
    logger.debug({ dateStr, method, asrMethod }, 'Prayer times cache MISS — calling AlAdhan')
    const methodId = resolveMethodId(method)
    const apiData  = await fetchFromAlAdhan(latitude, longitude, methodId, asrMethod, dateStr)

    const { timings, date: dateObj, meta: apiMeta } = apiData.data

    // ── 5. Write to cache (fire-and-forget; don't block response) ───────────
    const cachePayload = {
      latitude,
      longitude,
      date: new Date(dateStr),
      method,
      asrMethod,
      fajr:    stripAnnotation(timings.Fajr),
      sunrise: stripAnnotation(timings.Sunrise),
      dhuhr:   stripAnnotation(timings.Dhuhr),
      asr:     stripAnnotation(timings.Asr),
      maghrib: stripAnnotation(timings.Maghrib),
      isha:    stripAnnotation(timings.Isha),
      midnight:  timings.Midnight  ? stripAnnotation(timings.Midnight)  : undefined,
      lastThird: timings.Lastthird ? stripAnnotation(timings.Lastthird) : undefined,
      expiresAt: endOfDay(dateStr),
    }

    prayerTimesRepository.upsertCache(cachePayload).catch((cacheErr: unknown) => {
      logger.warn({ err: cacheErr }, 'Failed to write prayer times to cache (non-fatal)')
    })

    // ── 6. Normalise and return ─────────────────────────────────────────────
    const h = dateObj.hijri
    return {
      date: dateStr,
      hijriDate: {
        day:   parseInt(h.day, 10),
        month: h.month,
        year:  parseInt(h.year, 10),
      },
      method,
      asrMethod,
      location: { latitude, longitude },
      timings: {
        Fajr:    stripAnnotation(timings.Fajr),
        Sunrise: stripAnnotation(timings.Sunrise),
        Dhuhr:   stripAnnotation(timings.Dhuhr),
        Asr:     stripAnnotation(timings.Asr),
        Maghrib: stripAnnotation(timings.Maghrib),
        Isha:    stripAnnotation(timings.Isha),
        Midnight:  timings.Midnight  ? stripAnnotation(timings.Midnight)  : undefined,
        Lastthird: timings.Lastthird ? stripAnnotation(timings.Lastthird) : undefined,
      },
      meta: {
        timezone: apiMeta.timezone,
        calculationMethodId: methodId,
        cached: false,
      },
    }
  },
}
