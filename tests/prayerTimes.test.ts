/**
 * Prayer Times Service — Unit Tests
 *
 * Tests are pure unit tests: all I/O is mocked.
 * - prayerTimesRepository is mocked to control cache hits/misses
 * - node-fetch is mocked to control AlAdhan API responses
 * - No real network calls, no real database
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prayerTimesService } from '../src/services/prayerTimes.service'
import { prayerTimesRepository } from '../src/repositories/prayerTimes.repository'
import { ApiError } from '../src/utils/apiError'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/repositories/prayerTimes.repository', () => ({
  prayerTimesRepository: {
    findCached:    vi.fn(),
    upsertCache:   vi.fn(),
    deleteExpired: vi.fn(),
  },
}))

// Mock node-fetch so no real network calls are made
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_ALADHAN_RESPONSE = {
  code: 200,
  status: 'OK',
  data: {
    timings: {
      Fajr:     '04:31 (PKT)',
      Sunrise:  '06:08 (PKT)',
      Dhuhr:    '12:14 (PKT)',
      Asr:      '15:44 (PKT)',
      Maghrib:  '18:18 (PKT)',
      Isha:     '19:47 (PKT)',
      Midnight: '00:14 (PKT)',
      Lastthird:'02:02 (PKT)',
    },
    date: {
      readable:  '27 Aug 2026',
      timestamp: '1756290000',
      hijri: {
        day:   '3',
        month: { number: 3, en: 'Rabi al-Awwal', ar: 'ربيع الأول' },
        year:  '1448',
      },
      gregorian: { date: '27-08-2026' },
    },
    meta: {
      latitude:  24.8607,
      longitude: 67.0011,
      timezone:  'Asia/Karachi',
      method:    { id: 1, name: 'University of Islamic Sciences, Karachi' },
      latitudeAdjustmentMethod: 'ANGLE_BASED',
      school:    'Shafi',
    },
  },
}

const VALID_QUERY = {
  latitude:  24.8607,
  longitude: 67.0011,
  method:    'Karachi',
  asrMethod: 0,
  date:      '2026-08-27',
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('PrayerTimes Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Cache hit ─────────────────────────────────────────────────────────────

  describe('Cache hit path', () => {
    it('should return cached data without calling AlAdhan', async () => {
      const cachedRow = {
        id:        'cache-1',
        latitude:  24.8607,
        longitude: 67.0011,
        date:      new Date('2026-08-27'),
        method:    'Karachi',
        asrMethod: 0,
        fajr:     '04:31',
        sunrise:  '06:08',
        dhuhr:    '12:14',
        asr:      '15:44',
        maghrib:  '18:18',
        isha:     '19:47',
        midnight:  '00:14',
        lastThird: '02:02',
        expiresAt: new Date('2026-08-27T23:59:59Z'),
        createdAt: new Date(),
      }

      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(cachedRow as any)

      const result = await prayerTimesService.getPrayerTimes(VALID_QUERY as any)

      // Verify cache was checked
      expect(prayerTimesRepository.findCached).toHaveBeenCalledOnce()
      expect(prayerTimesRepository.findCached).toHaveBeenCalledWith(
        VALID_QUERY.latitude,
        VALID_QUERY.longitude,
        VALID_QUERY.date,
        VALID_QUERY.method,
        VALID_QUERY.asrMethod,
      )

      // upsertCache must NOT be called on cache hit
      expect(prayerTimesRepository.upsertCache).not.toHaveBeenCalled()

      // Verify response shape
      expect(result.timings.Fajr).toBe('04:31')
      expect(result.timings.Asr).toBe('15:44')
      expect(result.meta.cached).toBe(true)
      expect(result.location.latitude).toBe(VALID_QUERY.latitude)
    })
  })

  // ── Cache miss → API call ────────────────────────────────────────────────

  describe('Cache miss path', () => {
    it('should call AlAdhan API on cache miss and return normalised result', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      vi.mocked(prayerTimesRepository.upsertCache).mockResolvedValue({} as any)
      vi.mocked(fetch as any).mockResolvedValue({
        ok:   true,
        json: async () => MOCK_ALADHAN_RESPONSE,
      })

      const result = await prayerTimesService.getPrayerTimes(VALID_QUERY as any)

      // AlAdhan should have been called
      expect(fetch).toHaveBeenCalledOnce()

      // Strip annotation check — "(PKT)" suffix should be removed
      expect(result.timings.Fajr).toBe('04:31')
      expect(result.timings.Sunrise).toBe('06:08')
      expect(result.timings.Dhuhr).toBe('12:14')
      expect(result.timings.Asr).toBe('15:44')
      expect(result.timings.Maghrib).toBe('18:18')
      expect(result.timings.Isha).toBe('19:47')
      expect(result.timings.Midnight).toBe('00:14')
      expect(result.timings.Lastthird).toBe('02:02')

      // Hijri date conversion
      expect(result.hijriDate.day).toBe(3)
      expect(result.hijriDate.month.en).toBe('Rabi al-Awwal')
      expect(result.hijriDate.year).toBe(1448)

      // Meta
      expect(result.meta.cached).toBe(false)
      expect(result.meta.timezone).toBe('Asia/Karachi')

      // Cache write should have been attempted (fire-and-forget)
      // We await all microtasks to let the fire-and-forget complete
      await new Promise((r) => setTimeout(r, 10))
      expect(prayerTimesRepository.upsertCache).toHaveBeenCalledOnce()
    })

    it('should strip timezone annotation from time strings', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      vi.mocked(prayerTimesRepository.upsertCache).mockResolvedValue({} as any)
      vi.mocked(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          ...MOCK_ALADHAN_RESPONSE,
          data: {
            ...MOCK_ALADHAN_RESPONSE.data,
            timings: { ...MOCK_ALADHAN_RESPONSE.data.timings, Fajr: '04:31 (UTC+5)' },
          },
        }),
      })

      const result = await prayerTimesService.getPrayerTimes(VALID_QUERY as any)
      // Should contain only HH:MM, no "(UTC+5)"
      expect(result.timings.Fajr).toBe('04:31')
      expect(result.timings.Fajr).not.toContain('(')
    })
  })

  // ── Error handling ───────────────────────────────────────────────────────

  describe('Error handling', () => {
    it('should throw 400 ApiError when latitude is missing', async () => {
      const queryNoLat = { longitude: 67.0011, method: 'MWL', asrMethod: 0 }

      await expect(
        prayerTimesService.getPrayerTimes(queryNoLat as any),
      ).rejects.toThrow(ApiError)
      await expect(
        prayerTimesService.getPrayerTimes(queryNoLat as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('should throw 400 ApiError when longitude is missing', async () => {
      const queryNoLng = { latitude: 24.8607, method: 'MWL', asrMethod: 0 }

      await expect(
        prayerTimesService.getPrayerTimes(queryNoLng as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('should throw 500 ApiError when AlAdhan returns non-200 HTTP status', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      vi.mocked(fetch as any).mockResolvedValue({
        ok:         false,
        status:     503,
        statusText: 'Service Unavailable',
        json: async () => ({}),
      })

      await expect(
        prayerTimesService.getPrayerTimes(VALID_QUERY as any),
      ).rejects.toMatchObject({ statusCode: 500 })
    })

    it('should throw 500 ApiError when AlAdhan returns code != 200', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      vi.mocked(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ code: 400, status: 'Bad Request' }),
      })

      await expect(
        prayerTimesService.getPrayerTimes(VALID_QUERY as any),
      ).rejects.toMatchObject({ statusCode: 500 })
    })

    it('should throw 500 ApiError on network/fetch error', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      vi.mocked(fetch as any).mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(
        prayerTimesService.getPrayerTimes(VALID_QUERY as any),
      ).rejects.toMatchObject({ statusCode: 500 })
    })

    it('should degrade gracefully when cache lookup throws a DB error', async () => {
      const { default: fetch } = await import('node-fetch')
      // Cache throws DB error
      vi.mocked(prayerTimesRepository.findCached).mockRejectedValue(
        new Error('Connection refused'),
      )
      vi.mocked(prayerTimesRepository.upsertCache).mockResolvedValue({} as any)
      vi.mocked(fetch as any).mockResolvedValue({
        ok:   true,
        json: async () => MOCK_ALADHAN_RESPONSE,
      })

      // Should NOT throw — should fall through to API call
      const result = await prayerTimesService.getPrayerTimes(VALID_QUERY as any)
      expect(result.timings.Fajr).toBe('04:31')
      expect(result.meta.cached).toBe(false)
    })

    it('should not throw when cache write fails (fire-and-forget)', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      // Cache write fails silently
      vi.mocked(prayerTimesRepository.upsertCache).mockRejectedValue(
        new Error('DB write error'),
      )
      vi.mocked(fetch as any).mockResolvedValue({
        ok:   true,
        json: async () => MOCK_ALADHAN_RESPONSE,
      })

      // Should NOT bubble up the cache write error
      const result = await prayerTimesService.getPrayerTimes(VALID_QUERY as any)
      expect(result.timings.Fajr).toBe('04:31')
    })
  })

  // ── Method resolution ────────────────────────────────────────────────────

  describe('Method resolution', () => {
    it('should default to today when no date is provided', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      vi.mocked(prayerTimesRepository.upsertCache).mockResolvedValue({} as any)
      vi.mocked(fetch as any).mockResolvedValue({
        ok:   true,
        json: async () => MOCK_ALADHAN_RESPONSE,
      })

      const queryNoDate = { latitude: 24.8607, longitude: 67.0011, method: 'MWL', asrMethod: 0 }
      const result = await prayerTimesService.getPrayerTimes(queryNoDate as any)

      // date should default to today
      const today = new Date().toISOString().split('T')[0]
      expect(result.date).toBe(today)
    })

    it('should use asrMethod=1 (Hanafi) when passed', async () => {
      const { default: fetch } = await import('node-fetch')
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue(null)
      vi.mocked(prayerTimesRepository.upsertCache).mockResolvedValue({} as any)
      vi.mocked(fetch as any).mockResolvedValue({
        ok:   true,
        json: async () => MOCK_ALADHAN_RESPONSE,
      })

      const hanafiQuery = { ...VALID_QUERY, asrMethod: 1 }
      const result = await prayerTimesService.getPrayerTimes(hanafiQuery as any)

      expect(result.asrMethod).toBe(1)

      // Verify school=1 was sent to AlAdhan
      const fetchArgs = vi.mocked(fetch).mock.calls[0][0] as string
      expect(fetchArgs).toContain('school=1')
    })
  })
})
