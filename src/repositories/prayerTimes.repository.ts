/**
 * Prayer Times Repository
 *
 * Data-access layer for the PrayerTimeCache Prisma model.
 * All lat/lng values are rounded to 4 decimal places before storing
 * so nearby requests (< ~11 m apart) share the same cache row.
 *
 * Prisma model: PrayerTimeCache (@@unique [latitude, longitude, date, method])
 */

import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../config/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CacheWriteInput {
  latitude: number
  longitude: number
  date: Date          // date-only; time component is zeroed out
  method: string      // e.g. "MWL", "ISNA"
  asrMethod: number   // 0 = Standard, 1 = Hanafi
  fajr: string
  sunrise: string
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
  midnight?: string
  lastThird?: string
  expiresAt: Date
}

export interface CachedPrayerTimes {
  id: string
  latitude: Decimal
  longitude: Decimal
  date: Date
  method: string
  asrMethod: number
  fajr: string
  sunrise: string
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
  midnight: string | null
  lastThird: string | null
  expiresAt: Date
  createdAt: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round lat/lng to 4 decimal places (~11 m precision) so requests
 * for nearly identical coordinates share a single cache row.
 */
function bucket(coord: number): Decimal {
  return new Decimal(Math.round(coord * 1_0000) / 1_0000)
}

/**
 * Build the date-only value (midnight UTC for the given date string).
 */
function toDateOnly(dateStr: string): Date {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const prayerTimesRepository = {
  /**
   * Look up a non-expired cache entry for the given parameters.
   * Returns null on cache miss or if the entry has expired.
   */
  findCached: async (
    latitude: number,
    longitude: number,
    dateStr: string,
    method: string,
    asrMethod: number,
  ): Promise<CachedPrayerTimes | null> => {
    const lat = bucket(latitude)
    const lng = bucket(longitude)
    const date = toDateOnly(dateStr)
    const now = new Date()

    const row = await prisma.prayerTimeCache.findFirst({
      where: {
        latitude: lat,
        longitude: lng,
        date,
        method,
        asrMethod,
        expiresAt: { gt: now }, // only return non-expired rows
      },
    })

    return row as CachedPrayerTimes | null
  },

  /**
   * Write a new cache entry. Uses upsert on the unique key so duplicate
   * concurrent requests don't cause constraint violations.
   */
  upsertCache: async (input: CacheWriteInput): Promise<CachedPrayerTimes> => {
    const lat = bucket(input.latitude)
    const lng = bucket(input.longitude)
    const date = toDateOnly(input.date.toISOString().split('T')[0])

    const data = {
      latitude: lat,
      longitude: lng,
      date,
      method: input.method,
      asrMethod: input.asrMethod,
      fajr: input.fajr,
      sunrise: input.sunrise,
      dhuhr: input.dhuhr,
      asr: input.asr,
      maghrib: input.maghrib,
      isha: input.isha,
      midnight: input.midnight ?? null,
      lastThird: input.lastThird ?? null,
      expiresAt: input.expiresAt,
    }

    const row = await prisma.prayerTimeCache.upsert({
      where: {
        latitude_longitude_date_method_asrMethod: {
          latitude: lat,
          longitude: lng,
          date,
          method: input.method,
          asrMethod: input.asrMethod,
        },
      },
      create: data,
      update: {
        ...data,
        // Always refresh TTL on update
        expiresAt: input.expiresAt,
      },
    })

    return row as CachedPrayerTimes
  },

  /**
   * Delete all cache rows whose TTL has passed.
   * Call this from a scheduled job or lazily during requests.
   */
  deleteExpired: async (): Promise<number> => {
    const result = await prisma.prayerTimeCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    return result.count
  },
}

export default prayerTimesRepository
