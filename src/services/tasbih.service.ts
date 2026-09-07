/**
 * Tasbih Service
 *
 * Business logic for the dhikr counter feature.
 *
 * Responsibilities:
 *  - Validate business rules (count >= 1, target >= 1, count <= 9999)
 *    on top of what the Zod validator already enforces.
 *  - Delegate persistence to `tasbihRepository` — no raw Prisma here.
 *  - Build the daily and weekly stats response shapes.
 *  - Ensure every query is scoped to the requesting `userId`.
 */

import { ApiError } from '../utils/apiError'
import {
  tasbihRepository,
  type TasbihSessionRow,
  type DailyStats,
} from '../repositories/tasbih.repository'
import type { TasbihSaveBody } from '../validators/utility.validator'

// ─── Business-rule constants ──────────────────────────────────────────────────

const MAX_COUNT = 9_999   // guard against absurd values slipping past the validator
const MAX_TARGET = 9_999
const VALID_TARGETS = new Set([33, 99, 100, 1000]) // common Islamic dhikr counts

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's UTC date at midnight. */
function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Returns YYYY-MM-DD string from a Date. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Advances a date by `days` days (UTC). */
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** Returns the Monday (UTC) of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Map a DB row to the public session DTO. */
function mapSession(row: TasbihSessionRow) {
  return {
    id: row.id,
    phrase: row.phrase,
    arabicPhrase: row.arabicPhrase ?? null,
    count: row.count,
    target: row.target,
    isCompleted: row.isCompleted,
    sessionDate: toDateString(row.sessionDate),
    createdAt: row.createdAt.toISOString(),
  }
}

/** Build a DailyStats object from a set of rows belonging to a single date. */
function buildDayStats(date: Date, rows: TasbihSessionRow[]): DailyStats {
  const totalCount = rows.reduce((s, r) => s + r.count, 0)
  const completedCount = rows.filter((r) => r.isCompleted).length
  const phrases = [...new Set(rows.map((r) => r.phrase))]
  return {
    date: toDateString(date),
    totalCount,
    sessionCount: rows.length,
    completedCount,
    phrases,
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const tasbihService = {
  /**
   * POST /api/v1/utilities/tasbih/sessions
   *
   * Creates a new tasbih session for the authenticated user.
   * Applies business-rule guards on top of Zod validation:
   *  - count and target must not exceed MAX_COUNT / MAX_TARGET
   *  - count must not be negative (already enforced by validator but double-checked)
   */
  saveSession: async (userId: string, body: TasbihSaveBody): Promise<Record<string, unknown>> => {
    const count = body.count
    const target = body.target ?? 33

    // Defence-in-depth business rule checks
    if (count <= 0) throw ApiError.badRequest('count must be greater than 0')
    if (count > MAX_COUNT) throw ApiError.badRequest(`count must not exceed ${MAX_COUNT}`)
    if (target <= 0) throw ApiError.badRequest('target must be greater than 0')
    if (target > MAX_TARGET) throw ApiError.badRequest(`target must not exceed ${MAX_TARGET}`)

    const row = await tasbihRepository.createSession({
      userId,
      phrase: body.phrase,
      count,
      target,
      sessionDate: body.sessionDate,
    })

    return { session: mapSession(row) }
  },

  /**
   * GET /api/v1/utilities/tasbih/stats?range=daily|weekly
   *
   * Returns aggregated statistics scoped strictly to the requesting user.
   *
   * daily  → today's sessions + per-phrase breakdown
   * weekly → current week (Mon–Sun) with one DailyStats entry per day
   */
  getStats: async (userId: string, range: 'daily' | 'weekly'): Promise<Record<string, unknown>> => {
    const today = utcToday()

    if (range === 'daily') {
      const rows = await tasbihRepository.findByDate(userId, today)
      const stats = buildDayStats(today, rows)

      return {
        range: 'daily',
        stats,
        sessions: rows.map(mapSession),
      }
    }

    // Weekly: Monday → Sunday of the current week
    const monDay = weekStart(today)
    const sunDay = addDays(monDay, 6)

    const rows = await tasbihRepository.findByDateRange(userId, monDay, sunDay)

    // Build a map keyed by date string for O(1) lookup when constructing days
    const byDate = new Map<string, TasbihSessionRow[]>()
    for (const row of rows) {
      const key = toDateString(row.sessionDate)
      const bucket = byDate.get(key) ?? []
      bucket.push(row)
      byDate.set(key, bucket)
    }

    // Produce one DailyStats entry per calendar day Mon–Sun (even empty days)
    const dailyBreakdown: DailyStats[] = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(monDay, i)
      const key = toDateString(day)
      dailyBreakdown.push(buildDayStats(day, byDate.get(key) ?? []))
    }

    const weeklyTotalCount = dailyBreakdown.reduce((s, d) => s + d.totalCount, 0)
    const weeklySessionCount = dailyBreakdown.reduce((s, d) => s + d.sessionCount, 0)
    const weeklyCompletedCount = dailyBreakdown.reduce((s, d) => s + d.completedCount, 0)

    return {
      range: 'weekly',
      stats: {
        weekStart: toDateString(monDay),
        weekEnd: toDateString(sunDay),
        totalCount: weeklyTotalCount,
        sessionCount: weeklySessionCount,
        completedCount: weeklyCompletedCount,
        dailyBreakdown,
      },
    }
  },

  // ── Kept for the existing GET /sessions route ─────────────────────────────

  getHistory: async (userId: string): Promise<Record<string, unknown>> => {
    const today = utcToday()
    // Return the last 30 days of sessions, newest first
    const thirtyDaysAgo = addDays(today, -29)
    const rows = await tasbihRepository.findByDateRange(userId, thirtyDaysAgo, today)
    return { sessions: rows.reverse().map(mapSession) }
  },
}
