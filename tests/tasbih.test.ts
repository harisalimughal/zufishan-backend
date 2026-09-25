/**
 * Tasbih Service — Unit Tests
 *
 * Covers:
 *  - saveSession: happy path DTO shape, negative count, zero count, max count guard,
 *    max target guard, isCompleted flag (count >= target vs count < target)
 *  - getStats daily: DTO shape, empty day, phrase deduplication
 *  - getStats weekly: 7-day breakdown produced, totals aggregation,
 *    empty days included
 *  - getHistory: delegates to findByDateRange, returns sessions array
 *  - Data isolation: userId is forwarded to every repository call
 *
 * No network, no DB — tasbihRepository is fully mocked with vi.mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../src/utils/apiError'

// ─── Mock the repository ──────────────────────────────────────────────────────

vi.mock('../src/repositories/tasbih.repository', () => ({
  tasbihRepository: {
    createSession: vi.fn(),
    findByDate: vi.fn(),
    findByDateRange: vi.fn(),
  },
}))

import { tasbihService } from '../src/services/tasbih.service'
import { tasbihRepository } from '../src/repositories/tasbih.repository'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = new Date()
const TODAY_STR = new Date(
  Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate()),
)
  .toISOString()
  .slice(0, 10)

function makeRow(overrides: Partial<ReturnType<typeof baseRow>> = {}) {
  return { ...baseRow(), ...overrides }
}

function baseRow() {
  return {
    id: 'ses-001',
    userId: 'user-abc',
    phrase: 'SubhanAllah',
    arabicPhrase: 'سُبْحَانَ اللَّهِ',
    count: 33,
    target: 33,
    isCompleted: true,
    sessionDate: new Date(TODAY_STR + 'T00:00:00.000Z'),
    createdAt: new Date(),
  }
}

// ─── saveSession ──────────────────────────────────────────────────────────────

describe('tasbihService.saveSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a session and returns the correct DTO shape', async () => {
    vi.mocked(tasbihRepository.createSession).mockResolvedValueOnce(makeRow())

    const result = await tasbihService.saveSession('user-abc', {
      phrase: 'SubhanAllah',
      count: 33,
      target: 33,
    })

    const session = (result as { session: Record<string, unknown> }).session
    expect(session.id).toBe('ses-001')
    expect(session.phrase).toBe('SubhanAllah')
    expect(session.count).toBe(33)
    expect(session.target).toBe(33)
    expect(session.isCompleted).toBe(true)
    expect(typeof session.sessionDate).toBe('string')
    expect(typeof session.createdAt).toBe('string')
    // userId must NOT be returned
    expect(session.userId).toBeUndefined()
  })

  it('passes userId to the repository (data isolation)', async () => {
    vi.mocked(tasbihRepository.createSession).mockResolvedValueOnce(makeRow())

    await tasbihService.saveSession('user-abc', { phrase: 'Alhamdulillah', count: 33, target: 33 })

    expect(tasbihRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-abc' }),
    )
  })

  it('sets isCompleted=true when count >= target', async () => {
    vi.mocked(tasbihRepository.createSession).mockResolvedValueOnce(
      makeRow({ count: 33, target: 33, isCompleted: true }),
    )
    const result = await tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: 33, target: 33 })
    expect((result as { session: Record<string, unknown> }).session.isCompleted).toBe(true)
  })

  it('sets isCompleted=false when count < target', async () => {
    vi.mocked(tasbihRepository.createSession).mockResolvedValueOnce(
      makeRow({ count: 10, target: 33, isCompleted: false }),
    )
    const result = await tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: 10, target: 33 })
    expect((result as { session: Record<string, unknown> }).session.isCompleted).toBe(false)
  })

  it('rejects count = 0 with 400', async () => {
    await expect(
      tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: 0, target: 33 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects negative count with 400', async () => {
    await expect(
      tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: -5, target: 33 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects count exceeding MAX_COUNT (10000) with 400', async () => {
    await expect(
      tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: 10_001, target: 33 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects target exceeding MAX_TARGET (10000) with 400', async () => {
    await expect(
      tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: 1, target: 10_001 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects target = 0 with 400', async () => {
    await expect(
      tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: 1, target: 0 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('defaults target to 33 when not supplied', async () => {
    vi.mocked(tasbihRepository.createSession).mockResolvedValueOnce(makeRow({ target: 33 }))

    await tasbihService.saveSession('user-abc', { phrase: 'SubhanAllah', count: 33 })

    expect(tasbihRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ target: 33 }),
    )
  })
})

// ─── getStats — daily ─────────────────────────────────────────────────────────

describe('tasbihService.getStats (daily)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns daily DTO with correct shape', async () => {
    vi.mocked(tasbihRepository.findByDate).mockResolvedValueOnce([
      makeRow({ count: 33, isCompleted: true }),
      makeRow({ id: 'ses-002', phrase: 'Alhamdulillah', count: 20, isCompleted: false }),
    ])

    const result = await tasbihService.getStats('user-abc', 'daily')
    const stats = (result as { range: string; stats: Record<string, unknown> }).stats

    expect((result as Record<string, unknown>).range).toBe('daily')
    expect(stats.date).toBe(TODAY_STR)
    expect(stats.sessionCount).toBe(2)
    expect(stats.totalCount).toBe(53)   // 33 + 20
    expect(stats.completedCount).toBe(1)
    expect(Array.isArray(stats.phrases)).toBe(true)
  })

  it('deduplicates repeated phrases in the phrases list', async () => {
    vi.mocked(tasbihRepository.findByDate).mockResolvedValueOnce([
      makeRow({ id: 'ses-001', phrase: 'SubhanAllah' }),
      makeRow({ id: 'ses-002', phrase: 'SubhanAllah' }),
      makeRow({ id: 'ses-003', phrase: 'Alhamdulillah' }),
    ])

    const result = await tasbihService.getStats('user-abc', 'daily')
    const phrases = (result as { stats: Record<string, unknown> }).stats.phrases as string[]
    expect(phrases).toHaveLength(2)
    expect(phrases).toContain('SubhanAllah')
    expect(phrases).toContain('Alhamdulillah')
  })

  it('returns zero totals when no sessions today', async () => {
    vi.mocked(tasbihRepository.findByDate).mockResolvedValueOnce([])

    const result = await tasbihService.getStats('user-abc', 'daily')
    const stats = (result as { stats: Record<string, unknown> }).stats
    expect(stats.totalCount).toBe(0)
    expect(stats.sessionCount).toBe(0)
    expect(stats.completedCount).toBe(0)
  })

  it('passes userId to findByDate (data isolation)', async () => {
    vi.mocked(tasbihRepository.findByDate).mockResolvedValueOnce([])

    await tasbihService.getStats('user-xyz', 'daily')

    expect(tasbihRepository.findByDate).toHaveBeenCalledWith(
      'user-xyz',
      expect.any(Date),
    )
  })
})

// ─── getStats — weekly ────────────────────────────────────────────────────────

describe('tasbihService.getStats (weekly)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns weekly DTO with 7 daily breakdown entries', async () => {
    vi.mocked(tasbihRepository.findByDateRange).mockResolvedValueOnce([
      makeRow({ count: 33, isCompleted: true }),
    ])

    const result = await tasbihService.getStats('user-abc', 'weekly')

    expect((result as Record<string, unknown>).range).toBe('weekly')
    const stats = (result as { stats: Record<string, unknown> }).stats
    const breakdown = stats.dailyBreakdown as unknown[]
    expect(breakdown).toHaveLength(7)
    expect(typeof (stats as Record<string, unknown>).weekStart).toBe('string')
    expect(typeof (stats as Record<string, unknown>).weekEnd).toBe('string')
  })

  it('aggregates weekly totals correctly', async () => {
    // Two sessions on two different days
    const mon = (() => {
      const d = new Date()
      const day = d.getUTCDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setUTCDate(d.getUTCDate() + diff)
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    })()

    vi.mocked(tasbihRepository.findByDateRange).mockResolvedValueOnce([
      makeRow({ sessionDate: mon, count: 33, isCompleted: true }),
      makeRow({ id: 'ses-002', sessionDate: mon, count: 99, isCompleted: true }),
    ])

    const result = await tasbihService.getStats('user-abc', 'weekly')
    const stats = (result as { stats: Record<string, unknown> }).stats

    expect(stats.totalCount).toBe(132)    // 33 + 99
    expect(stats.sessionCount).toBe(2)
    expect(stats.completedCount).toBe(2)
  })

  it('includes empty days (zero count) in breakdown', async () => {
    vi.mocked(tasbihRepository.findByDateRange).mockResolvedValueOnce([])

    const result = await tasbihService.getStats('user-abc', 'weekly')
    const { dailyBreakdown } = (result as { stats: { dailyBreakdown: Array<{ totalCount: number }> } }).stats

    expect(dailyBreakdown).toHaveLength(7)
    expect(dailyBreakdown.every((d) => d.totalCount === 0)).toBe(true)
  })

  it('passes userId to findByDateRange (data isolation)', async () => {
    vi.mocked(tasbihRepository.findByDateRange).mockResolvedValueOnce([])

    await tasbihService.getStats('user-xyz', 'weekly')

    expect(tasbihRepository.findByDateRange).toHaveBeenCalledWith(
      'user-xyz',
      expect.any(Date),
      expect.any(Date),
    )
  })
})

// ─── getHistory ───────────────────────────────────────────────────────────────

describe('tasbihService.getHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns sessions array', async () => {
    vi.mocked(tasbihRepository.findByDateRange).mockResolvedValueOnce([
      makeRow(),
      makeRow({ id: 'ses-002' }),
    ])

    const result = await tasbihService.getHistory('user-abc')
    const sessions = (result as { sessions: unknown[] }).sessions
    expect(Array.isArray(sessions)).toBe(true)
    expect(sessions).toHaveLength(2)
  })

  it('passes userId to findByDateRange (data isolation)', async () => {
    vi.mocked(tasbihRepository.findByDateRange).mockResolvedValueOnce([])

    await tasbihService.getHistory('user-xyz')

    expect(tasbihRepository.findByDateRange).toHaveBeenCalledWith(
      'user-xyz',
      expect.any(Date),
      expect.any(Date),
    )
  })

  it('does not expose userId in session DTOs', async () => {
    vi.mocked(tasbihRepository.findByDateRange).mockResolvedValueOnce([makeRow()])

    const result = await tasbihService.getHistory('user-abc')
    const sessions = (result as { sessions: Record<string, unknown>[] }).sessions
    expect(sessions[0].userId).toBeUndefined()
  })
})

// ─── Validator — tasbihStatsQuerySchema ──────────────────────────────────────

describe('tasbihStatsQuerySchema', () => {
  it('parses without errors', async () => {
    const { tasbihStatsQuerySchema } = await import('../src/validators/utility.validator')

    const daily = await tasbihStatsQuerySchema.parseAsync({ range: 'daily' })
    expect(daily.range).toBe('daily')

    const weekly = await tasbihStatsQuerySchema.parseAsync({ range: 'weekly' })
    expect(weekly.range).toBe('weekly')
  })

  it('defaults to daily when range is omitted', async () => {
    const { tasbihStatsQuerySchema } = await import('../src/validators/utility.validator')
    const result = await tasbihStatsQuerySchema.parseAsync({})
    expect(result.range).toBe('daily')
  })

  it('rejects invalid range values', async () => {
    const { tasbihStatsQuerySchema } = await import('../src/validators/utility.validator')
    await expect(tasbihStatsQuerySchema.parseAsync({ range: 'monthly' })).rejects.toThrow()
  })
})
