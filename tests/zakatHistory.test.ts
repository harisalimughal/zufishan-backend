/**
 * Zakat History — Unit Tests
 *
 * Covers:
 *   - Query-param validation (page / limit / currency)
 *   - Authenticated-user scoping (repository always receives caller userId)
 *   - Data isolation (foreign rows filtered; empty userId rejected)
 *   - Pagination metadata consistency
 *   - Auth middleware 401 without / with bad token
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { zakatHistoryService } from '../src/services/zakatHistory.service'
import { zakatCalculationRepository } from '../src/repositories/zakatCalculation.repository'
import { zakatHistoryQuerySchema } from '../src/validators/utility.validator'
import { ApiError } from '../src/utils/apiError'
import { authenticate } from '../src/middlewares/auth.middleware'
import type { Decimal } from '@prisma/client/runtime/library'

vi.mock('../src/repositories/zakatCalculation.repository', () => ({
  zakatCalculationRepository: {
    findByUserIdPaginated: vi.fn(),
  },
}))

vi.mock('../src/utils/jwt', () => ({
  verifyToken: vi.fn(),
}))

import { verifyToken } from '../src/utils/jwt'

function toDecimal(n: number): Decimal {
  return {
    toString: () => String(n),
    toFixed: (d: number) => n.toFixed(d),
  } as unknown as Decimal
}

function makeRow(overrides: {
  id: string
  userId: string | null
  createdAt: Date
  currency?: string
  zakatDue?: number
}) {
  return {
    id: overrides.id,
    userId: overrides.userId,
    goldGrams: toDecimal(0),
    silverGrams: toDecimal(0),
    cashSavings: toDecimal(1000),
    investments: toDecimal(0),
    businessAssets: toDecimal(0),
    receivables: toDecimal(0),
    totalZakatableAssets: toDecimal(1000),
    nisabThreshold: toDecimal(500),
    zakatDue: toDecimal(overrides.zakatDue ?? 25),
    zakatableAboveNisab: true,
    currency: overrides.currency ?? 'USD',
    nisabRateId: null,
    createdAt: overrides.createdAt,
  }
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}

// ─── Query validation ─────────────────────────────────────────────────────────

describe('zakatHistoryQuerySchema', () => {
  it('defaults page=1 and limit=10', () => {
    const parsed = zakatHistoryQuerySchema.parse({})
    expect(parsed.page).toBe(1)
    expect(parsed.limit).toBe(10)
  })

  it('parses valid page and limit', () => {
    const parsed = zakatHistoryQuerySchema.parse({ page: '3', limit: '20' })
    expect(parsed.page).toBe(3)
    expect(parsed.limit).toBe(20)
  })

  it('uppercases currency', () => {
    const parsed = zakatHistoryQuerySchema.parse({ currency: 'pkr' })
    expect(parsed.currency).toBe('PKR')
  })

  it('rejects page=0', () => {
    expect(() => zakatHistoryQuerySchema.parse({ page: '0' })).toThrow()
  })

  it('rejects negative page', () => {
    expect(() => zakatHistoryQuerySchema.parse({ page: '-1' })).toThrow()
  })

  it('rejects non-integer page', () => {
    expect(() => zakatHistoryQuerySchema.parse({ page: '1.5' })).toThrow()
    expect(() => zakatHistoryQuerySchema.parse({ page: 'abc' })).toThrow()
  })

  it('rejects limit above 50', () => {
    expect(() => zakatHistoryQuerySchema.parse({ limit: '51' })).toThrow()
  })

  it('rejects invalid currency length', () => {
    expect(() => zakatHistoryQuerySchema.parse({ currency: 'US' })).toThrow()
    expect(() => zakatHistoryQuerySchema.parse({ currency: 'USDD' })).toThrow()
  })
})

// ─── Auth middleware ──────────────────────────────────────────────────────────

describe('authenticate middleware (zakat history authorization)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} } as Request
    const res = mockRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.statusCode).toBe(401)
    expect((res.body as { success: boolean }).success).toBe(false)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token format is invalid (no Bearer token)', () => {
    const req = { headers: { authorization: 'Bearer' } } as Request
    const res = mockRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is expired/invalid', () => {
    vi.mocked(verifyToken).mockReturnValue(null)
    const req = { headers: { authorization: 'Bearer bad.token' } } as Request
    const res = mockRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next and attaches user when token is valid', () => {
    vi.mocked(verifyToken).mockReturnValue({
      id: 'user-a',
      email: 'a@example.com',
      role: 'STUDENT',
    })
    const req = { headers: { authorization: 'Bearer good.token' } } as Request
    const res = mockRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect((req as Request).user?.id).toBe('user-a')
  })
})

// ─── History service — isolation & pagination ─────────────────────────────────

describe('zakatHistoryService.getHistory()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('always queries the repository with the authenticated userId', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [],
      total: 0,
    })

    await zakatHistoryService.getHistory('user-a', { page: 1, limit: 10 })

    expect(zakatCalculationRepository.findByUserIdPaginated).toHaveBeenCalledWith({
      userId: 'user-a',
      page: 1,
      limit: 10,
    })
  })

  it('never accepts an empty userId (authorization gate)', async () => {
    await expect(
      zakatHistoryService.getHistory('', { page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(zakatCalculationRepository.findByUserIdPaginated).not.toHaveBeenCalled()
  })

  it('passes currency filter only as a scoped filter alongside userId', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [],
      total: 0,
    })

    await zakatHistoryService.getHistory('user-a', {
      page: 2,
      limit: 5,
      currency: 'PKR',
    })

    expect(zakatCalculationRepository.findByUserIdPaginated).toHaveBeenCalledWith({
      userId: 'user-a',
      page: 2,
      limit: 5,
      currency: 'PKR',
    })
  })

  it('returns only the caller\'s rows — filters out any foreign userId (isolation)', async () => {
    const now = new Date('2026-09-06T12:00:00.000Z')
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [
        makeRow({ id: 'calc-1', userId: 'user-a', createdAt: now }),
        // Simulate a buggy/compromised data path returning another user's row
        makeRow({ id: 'calc-other', userId: 'user-b', createdAt: now }),
      ],
      total: 1,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 1,
      limit: 10,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.id).toBe('calc-1')
    expect(result.items[0]!.userId).toBe('user-a')
    expect(result.items.find((i) => i.userId === 'user-b')).toBeUndefined()
  })

  it('does not expose guest (null userId) rows to an authenticated user', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [
        makeRow({ id: 'guest', userId: null, createdAt: new Date() }),
        makeRow({ id: 'mine', userId: 'user-a', createdAt: new Date() }),
      ],
      total: 1,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 1,
      limit: 10,
    })

    expect(result.items.map((i) => i.id)).toEqual(['mine'])
  })

  it('orders expectation: repository is asked for newest-first page window', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [
        makeRow({
          id: 'newer',
          userId: 'user-a',
          createdAt: new Date('2026-09-06T18:00:00.000Z'),
          zakatDue: 50,
        }),
        makeRow({
          id: 'older',
          userId: 'user-a',
          createdAt: new Date('2026-09-01T18:00:00.000Z'),
          zakatDue: 25,
        }),
      ],
      total: 2,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 1,
      limit: 10,
    })

    expect(result.items[0]!.id).toBe('newer')
    expect(result.items[1]!.id).toBe('older')
  })

  it('returns consistent pagination metadata on page 1 of many', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [
        makeRow({ id: '1', userId: 'user-a', createdAt: new Date() }),
      ],
      total: 25,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 1,
      limit: 10,
    })

    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    })
  })

  it('returns consistent pagination metadata on a middle page', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [
        makeRow({ id: '11', userId: 'user-a', createdAt: new Date() }),
      ],
      total: 25,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 2,
      limit: 10,
    })

    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    })
  })

  it('returns consistent pagination metadata on the last page', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [
        makeRow({ id: '21', userId: 'user-a', createdAt: new Date() }),
      ],
      total: 25,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 3,
      limit: 10,
    })

    expect(result.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: false,
      hasPrev: true,
    })
  })

  it('returns empty pagination when the user has no calculations', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [],
      total: 0,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 1,
      limit: 10,
    })

    expect(result.items).toEqual([])
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    })
  })

  it('serializes Decimal fields to plain numbers and ISO dates', async () => {
    const createdAt = new Date('2026-09-06T10:30:00.000Z')
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [
        makeRow({
          id: 'calc-1',
          userId: 'user-a',
          createdAt,
          zakatDue: 25,
        }),
      ],
      total: 1,
    })

    const result = await zakatHistoryService.getHistory('user-a', {
      page: 1,
      limit: 10,
    })

    expect(result.items[0]!.zakatDue).toBe(25)
    expect(result.items[0]!.createdAt).toBe('2026-09-06T10:30:00.000Z')
    expect(typeof result.items[0]!.totalZakatableAssets).toBe('number')
  })

  it('user-b history call never reuses user-a\'s id in the repository query', async () => {
    vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
      rows: [],
      total: 0,
    })

    await zakatHistoryService.getHistory('user-b', { page: 1, limit: 10 })
    await zakatHistoryService.getHistory('user-a', { page: 1, limit: 10 })

    const calls = vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mock.calls
    expect(calls[0]![0].userId).toBe('user-b')
    expect(calls[1]![0].userId).toBe('user-a')
    expect(calls[0]![0].userId).not.toBe(calls[1]![0].userId)
  })
})
