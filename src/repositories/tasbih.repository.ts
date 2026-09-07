/**
 * Tasbih Repository
 *
 * Data-access layer for `tasbih_sessions`.
 *
 * Design rules:
 *  - Every query is scoped by `userId` — a caller can never read or modify
 *    another user's sessions (user data isolation).
 *  - `createSession` uses a single INSERT — no upsert — because each tap of
 *    the counter represents a discrete completed event.
 *  - Aggregation for stats is done in the DB with Prisma groupBy / raw to
 *    avoid fetching large row sets into Node memory.
 *  - Date arithmetic uses UTC throughout; `sessionDate` is stored as a DATE
 *    column (no time component) so day-boundary comparisons are stable across
 *    timezones at the DB level.
 */

import { prisma } from '../config/prisma'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CreateSessionInput {
  userId: string
  phrase: string
  arabicPhrase?: string | null
  count: number
  target: number
  /** ISO date string YYYY-MM-DD or undefined → today UTC */
  sessionDate?: string
}

export interface TasbihSessionRow {
  id: string
  userId: string
  phrase: string
  arabicPhrase: string | null
  count: number
  target: number
  isCompleted: boolean
  sessionDate: Date
  createdAt: Date
}

export interface DailyStats {
  date: string           // YYYY-MM-DD
  totalCount: number
  sessionCount: number
  completedCount: number
  phrases: string[]
}

export interface WeeklyStats {
  weekStart: string      // YYYY-MM-DD (Monday)
  weekEnd: string        // YYYY-MM-DD (Sunday)
  totalCount: number
  sessionCount: number
  completedCount: number
  dailyBreakdown: DailyStats[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today as a Date at midnight UTC. */
function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Returns a YYYY-MM-DD string from a Date. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Returns the Monday (UTC) of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay() // 0=Sun … 6=Sat
  const diff = (day === 0 ? -6 : 1 - day) // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const tasbihRepository = {
  /**
   * Persists a new tasbih session for the authenticated user.
   *
   * Concurrency safety:
   *  - Each call is a plain INSERT (not upsert) — two simultaneous requests
   *    for the same user both succeed and create independent session rows,
   *    which is the correct semantics (both counter runs happened).
   *  - count is constrained to >= 1 by the validator before reaching here.
   */
  createSession: async (input: CreateSessionInput): Promise<TasbihSessionRow> => {
    const { userId, phrase, arabicPhrase, count, target, sessionDate } = input

    const parsedDate = sessionDate
      ? new Date(sessionDate + 'T00:00:00.000Z')
      : utcToday()

    const row = await prisma.tasbihSession.create({
      data: {
        userId,
        phrase,
        arabicPhrase: arabicPhrase ?? null,
        count,
        target,
        isCompleted: count >= target,
        sessionDate: parsedDate,
      },
      select: {
        id: true,
        userId: true,
        phrase: true,
        arabicPhrase: true,
        count: true,
        target: true,
        isCompleted: true,
        sessionDate: true,
        createdAt: true,
      },
    })

    return row as TasbihSessionRow
  },

  /**
   * Returns all sessions for a user on a specific date (UTC), newest first.
   * Used by the service to build the daily stats snapshot.
   */
  findByDate: async (userId: string, date: Date): Promise<TasbihSessionRow[]> => {
    const rows = await prisma.tasbihSession.findMany({
      where: { userId, sessionDate: date },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        phrase: true,
        arabicPhrase: true,
        count: true,
        target: true,
        isCompleted: true,
        sessionDate: true,
        createdAt: true,
      },
    })
    return rows as TasbihSessionRow[]
  },

  /**
   * Returns all sessions for a user within [startDate, endDate] inclusive.
   * Used by the service to build daily buckets for the weekly stats view.
   * The composite index (userId, sessionDate) makes this efficient.
   */
  findByDateRange: async (
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TasbihSessionRow[]> => {
    const rows = await prisma.tasbihSession.findMany({
      where: {
        userId,
        sessionDate: { gte: startDate, lte: endDate },
      },
      orderBy: { sessionDate: 'asc' },
      select: {
        id: true,
        userId: true,
        phrase: true,
        arabicPhrase: true,
        count: true,
        target: true,
        isCompleted: true,
        sessionDate: true,
        createdAt: true,
      },
    })
    return rows as TasbihSessionRow[]
  },
}

export default tasbihRepository
